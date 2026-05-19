import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PrismaService } from 'src/prisma.service';
import Stripe from 'stripe';
import { FREE_PLAN_LIMITS, getPlanConfig, getPlanConfigByProductId, registerPriceProduct } from './plans.config';

@Injectable()
export class WorkspaceSubscriptionService {
    private readonly logger = new Logger(WorkspaceSubscriptionService.name);

    constructor(
        private readonly stripeService: StripeService,
        private readonly prisma: PrismaService,
    ) {}

    // Crear nueva suscripción

    async createSubscription(
        workspaceId: string,
        subscriberUserId: string,
        priceId: string,
    ) {
        // 1. Verificar que el usuario es el propietario del workspace y que no tiene una suscripción activa
        const membership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    userId: subscriberUserId,
                    workspaceId,
                },
            },
            include: {
                workspace: {
                    include: {
                        subscription: true,
                    },
                },
                user: true,
            },
        });

        if (!membership) {
            throw new Error('User is not a member of the workspace');
        }

        if (!membership.isOwner) {
            throw new Error('Only workspace owners can manage subscriptions');
        }

        const { workspace } = membership;

        if (
            workspace.subscription &&
            (workspace.subscription.status === 'active' ||
                workspace.subscription.status === 'trialing')
        ) {
            throw new Error(
                'This workspace already has an active subscription',
            );
        }

        // 2. Crear cliente en Stripe si no existe y guardar el ID en la base de datos
        let customerId = membership.user.stripeCustomerId;

        if (!customerId) {
            const customer = await this.stripeService.createCustomer(
                membership.user.email,
                membership.user.name,
                { userId: subscriberUserId },
            );
            customerId = customer.id;

            await this.prisma.user.update({
                where: { id: subscriberUserId },
                data: { stripeCustomerId: customerId },
            });
        }

        // 3. Crear suscripción en Stripe con metadata para el webhook
        const stripeSubscription = await this.stripeService.createSubscription(
            customerId,
            priceId,
            {
                metadata: {
                    workspaceId,
                    subscriberUserId,
                },
            },
        );

        // 4. Persistir en DB
        await this.upsertSubscriptionFromStripe(
            workspaceId,
            subscriberUserId,
            stripeSubscription,
        );

        // 5. Marcar al miembro como "suscriptor" en la base de datos
        await this.prisma.workspaceMember.update({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: subscriberUserId,
                },
            },
            data: {
                isSubscriber: true,
            },
        });

        // 6. Devolver clientSecret para que el frontend confirme el pago
        const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
        const paymentIntent = invoice?.confirmation_secret;

        return {
            subscriptionId: stripeSubscription.id,
            clientSecret: paymentIntent ?? null,
        };
    }

    // Cambiar plan (upgrade / downgrade)

    async changePlan(
        workspaceId: string,
        requestingUserId: string,
        newPriceId: string,
    ) {
        await this.assertOwner(requestingUserId, workspaceId);

        const subscription = await this.getSubscriptionOrThrow(workspaceId);

        const updatedSubscription = await this.stripeService.updateSubscription(
            subscription.stripeSubscriptionId,
            newPriceId,
        );

        await this.upsertSubscriptionFromStripe(
            workspaceId,
            subscription.subscriberUserId,
            updatedSubscription,
        );

        return {
            success: true,
            newPlan: getPlanConfig(newPriceId).plan,
        };
    }

    // Cancelar suscripción

    async cancelSubscription(
        workspaceId: string,
        requestingUserId: string,
        immediately = false,
    ) {
        await this.assertOwner(requestingUserId, workspaceId);

        const subscription = await this.getSubscriptionOrThrow(workspaceId);

        let updated: Stripe.Subscription;

        if (immediately) {
            updated = await this.stripeService.cancelSubscription(
                subscription.stripeSubscriptionId,
            );
        } else {
            updated = await this.stripeService.scheduleCancel(
                subscription.stripeSubscriptionId,
            );
        }

        await this.upsertSubscriptionFromStripe(
            workspaceId,
            subscription.subscriberUserId,
            updated,
        );

        return { success: true };
    }

    // Reactivar suscripción cancelada (cancel_at_period_end → false)

    async reactivateSubscription(workspaceId: string, requestingUserId: string) {
        await this.assertOwner(requestingUserId, workspaceId);

        const subscription = await this.getSubscriptionOrThrow(workspaceId);

        const updated = await this.stripeService.undoScheduleCancel(
            subscription.stripeSubscriptionId,
        );

        await this.upsertSubscriptionFromStripe(
            workspaceId,
            subscription.subscriberUserId,
            updated,
        );

        return { success: true };
    }

    // Billing Portal
    // Abre el portal de Stripe del usuario - desde ahí gestiona todas las opciones de facturación (cambio de tarjeta, downgrade, cancelación, etc)

    async getBillingPortalUrl(
        workspaceId: string,
        requestingUserId: string,
        returnUrl: string,
    ) {
        await this.assertOwner(requestingUserId, workspaceId);

        const user = await this.prisma.user.findUnique({
            where: { id: requestingUserId },
            select: { stripeCustomerId: true },
        });

        if (!user?.stripeCustomerId) {
            throw new NotFoundException('Cliente de Stripe no encontrado');
        }

        const session = await this.stripeService.createBillingPortalSession(
            user.stripeCustomerId,
            returnUrl,
        );

        return { url: session.url };
    }

    // Obtener suscripción activa del workspace
    async getSubscription(workspaceId: string) {
        return await this.prisma.workspaceSubscription.findUnique({
            where: { workspaceId },
            include: {
                subscriberUser: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });
    }

    // Precios de los planes desde Stripe

    async getPlanPrices() {
        const priceIds = [
            process.env.STRIPE_PRICE_PRO,
            process.env.STRIPE_PRICE_ENTERPRISE,
        ].filter(Boolean) as string[];

        const results = await Promise.all(
            priceIds.map(async (priceId) => {
                try {
                    const price = await this.stripeService.getPrice(priceId);
                    return {
                        plan: getPlanConfig(priceId).plan,
                        priceId: price.id,
                        amount: price.unit_amount ?? 0,
                        currency: price.currency,
                        interval: (price.recurring?.interval ?? 'month') as string,
                    };
                } catch (err) {
                    this.logger.error(`Error fetching price ${priceId}: ${err.message}`);
                    return null;
                }
            }),
        );

        return results.filter(Boolean);
    }

    // Checkout Session (para nuevas suscripciones via Stripe Checkout)

    async createCheckoutSession(
        workspaceId: string,
        userId: string,
        plan: 'pro' | 'enterprise',
        successUrl: string,
        cancelUrl: string,
    ) {
        await this.assertOwner(userId, workspaceId);

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                stripeCustomerId: true,
                email: true,
                name: true,
            },
        });

        if (!user) throw new NotFoundException('Usuario no encontrado');

        let customerId = user.stripeCustomerId;

        if (!customerId) {
            const customer = await this.stripeService.createCustomer(
                user.email,
                user.name,
                { userId },
            );
            customerId = customer.id;
            await this.prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: customerId },
            });
        }

        const productId =
            plan === 'pro'
                ? process.env.STRIPE_PRODUCT_PRO
                : process.env.STRIPE_PRODUCT_ENTERPRISE;

        if (!productId) {
            throw new Error(`Product ID not configured for plan: ${plan}`);
        }

        const activePrice = await this.stripeService.getActivePriceByProduct(productId);
        if (!activePrice) {
            throw new Error(`No active price found for product: ${productId}`);
        }

        const priceId = activePrice.id;
        registerPriceProduct(priceId, productId);

        const session = await this.stripeService.createCheckoutSession(
            customerId,
            priceId,
            successUrl,
            cancelUrl,
            { workspaceId, subscriberUserId: userId },
        );

        return { url: session.url };
    }

    // Sync manual desde Stripe (llamado desde el frontend tras el redirect de checkout)

    async syncSubscriptionFromStripe(
        workspaceId: string,
        requestingUserId: string,
    ) {
        await this.assertOwner(requestingUserId, workspaceId);

        const existing = await this.prisma.workspaceSubscription.findUnique({
            where: { workspaceId },
            select: { stripeSubscriptionId: true, subscriberUserId: true },
        });

        if (!existing?.stripeSubscriptionId) {
            // Sin suscripción guardada — buscar por customerId del usuario
            const user = await this.prisma.user.findUnique({
                where: { id: requestingUserId },
                select: { stripeCustomerId: true },
            });

            if (!user?.stripeCustomerId) return { synced: false };

            const subscriptions = await this.stripeService.listActiveSubscriptions(user.stripeCustomerId);
            const match = subscriptions.find(
                (s) => s.metadata?.workspaceId === workspaceId,
            );

            if (!match) return { synced: false };

            await this.upsertSubscriptionFromStripe(workspaceId, requestingUserId, match);
            return { synced: true };
        }

        const stripeSubscription = await this.stripeService.getSubscription(
            existing.stripeSubscriptionId,
        );

        await this.upsertSubscriptionFromStripe(
            workspaceId,
            existing.subscriberUserId,
            stripeSubscription,
        );

        return { synced: true };
    }

    // Sync desde Stripe (webhook)

    async upsertSubscriptionFromStripe(
        workspaceId: string,
        subscriberUserId: string,
        stripeSubscription: Stripe.Subscription,
    ) {
        const priceId = stripeSubscription.items.data[0].price.id;
        const productId = stripeSubscription.items.data[0].price.product as string;
        const currentPeriodStart = new Date(
            stripeSubscription.items.data[0].current_period_start * 1000,
        );
        const currentPeriodEnd = new Date(
            stripeSubscription.items.data[0].current_period_end * 1000,
        );
        registerPriceProduct(priceId, productId);
        const planConfig = getPlanConfigByProductId(productId);
        const isActive = ['active', 'trialing'].includes(
            stripeSubscription.status,
        );

        const subscriptionData = {
            subscriberUserId,
            stripeSubscriptionId: stripeSubscription.id,
            stripePriceId: priceId,
            stripeProductId: productId,
            status: stripeSubscription.status as any,
            plan: planConfig.plan as any,
            seatsLimit: planConfig.seatsLimit,
            storageLimit: planConfig.storageLimit,
            currentPeriodStart: currentPeriodStart,
            currentPeriodEnd: currentPeriodEnd,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            canceledAt: stripeSubscription.canceled_at
                ? new Date(stripeSubscription.canceled_at * 1000)
                : null,
            trialStart: stripeSubscription.trial_start
                ? new Date(stripeSubscription.trial_start * 1000)
                : null,
            trialEnd: stripeSubscription.trial_end
                ? new Date(stripeSubscription.trial_end * 1000)
                : null,
        };

        await this.prisma.workspaceSubscription.upsert({
            where: { workspaceId },
            create: { workspaceId, ...subscriptionData },
            update: subscriptionData,
        });

        await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                plan: isActive ? (planConfig.plan as any) : 'free',
                seatsLimit: isActive
                    ? planConfig.seatsLimit
                    : FREE_PLAN_LIMITS.seatsLimit,
                storageLimit: isActive
                    ? planConfig.storageLimit
                    : FREE_PLAN_LIMITS.storageLimit,
            },
        });

        this.logger.log(
            `Synced → workspace:${workspaceId} | plan:${planConfig.plan} | status:${stripeSubscription.status}`,
        );
    }

    // Resolver workspaceId desde una Stripe Subscription (usado en el webhook)

    async resolveWorkspaceId(
        stripeSubscription: Stripe.Subscription,
    ): Promise<{ workspaceId: string; subscriberUserId: string } | null> {
        const workspaceId = stripeSubscription.metadata?.workspaceId;
        const subscriberUserId = stripeSubscription.metadata?.subscriberUserId;

        if (workspaceId && subscriberUserId) {
            return { workspaceId, subscriberUserId };
        }

        // Fallback: buscar en la base de datos usando el stripeSubscriptionId (por si no viene en la metadata)
        const existing = await this.prisma.workspaceSubscription.findUnique({
            where: { stripeSubscriptionId: stripeSubscription.id },
            select: { workspaceId: true, subscriberUserId: true },
        });

        if (!existing) return null;

        return {
            workspaceId: existing.workspaceId,
            subscriberUserId: existing.subscriberUserId,
        };
    }

    // Helpers

    private async getSubscriptionOrThrow(workspaceId: string) {
        const subscription = await this.prisma.workspaceSubscription.findUnique(
            {
                where: { workspaceId },
            },
        );
        if (!subscription) {
            throw new NotFoundException(
                'No subscription found for this workspace',
            );
        }
        return subscription;
    }

    private async assertOwner(userId: string, workspaceId: string) {
        const membership = await this.prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
            select: { isOwner: true },
        });

        if (!membership) {
            throw new NotFoundException(
                'User is not a member of this workspace',
            );
        }

        if (!membership.isOwner) {
            throw new ForbiddenException(
                'Only workspace owners can manage subscriptions',
            );
        }
    }
}
