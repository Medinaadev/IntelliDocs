import {
    BadRequestException,
    Controller,
    Headers,
    HttpCode,
    Logger,
    Post,
    RawBodyRequest,
    Req,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { WorkspaceSubscriptionService } from './workspace-subscription.service';
import Stripe from 'stripe';

@Controller('webhooks/stripe')
export class StripeWebhookController {
    private readonly logger = new Logger(StripeWebhookController.name);

    constructor(
        private readonly stripeService: StripeService,
        private readonly workspaceSubscriptionService: WorkspaceSubscriptionService,
    ) {}

    @Post()
    @HttpCode(200) // Stripe espera un 200 para considerar el webhook recibido correctamente
    async handleWebhook(
        @Headers('stripe-signature') signature: string,
        @Req() req: RawBodyRequest<Request>,
    ) {
        if (!signature) {
            throw new BadRequestException('Missing Stripe signature');
        }

        if (!req.rawBody) {
            throw new BadRequestException(
                'Missing raw body for Stripe webhook',
            );
        }

        let event: Stripe.Event;

        try {
            event = this.stripeService.constructWebhookEvent(
                req.rawBody,
                signature,
            );
        } catch (err) {
            this.logger.error(
                `Webhook signature verification failed: ${err.message}`,
            );
            throw new BadRequestException('Invalid Stripe signature');
        }

        this.logger.log(`Received Stripe event: ${event.type}`);

        try {
            await this.routeEvent(event);
        } catch (err) {
            // Devolvemos 200 para evitar reintentos, pero logueamos el error para investigarlo
            this.logger.error(
                `Error processing Stripe event [${event.type}]: ${err.message}`,
                err.stack,
            );
        }

        return { received: true };
    }

    // Ruteo de eventos

    private async routeEvent(event: Stripe.Event): Promise<void> {
        switch (event.type) {
            // Checkout completado
            case 'checkout.session.completed':
                await this.onCheckoutCompleted(event.data.object);
                break;

            // Ciclo de vida de suscripciones
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await this.onSubscriptionChanged(event.data.object);
                break;

            // Pagos
            case 'invoice.payment_succeeded':
                await this.onPaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await this.onPaymentFailed(event.data.object);
                break;

            // Trial proximo a finalizar
            case 'customer.subscription.trial_will_end':
                await this.onTrialWillEnd(event.data.object);
                break;

            default:
                this.logger.warn(`Unhandled Stripe event type: ${event.type}`);
        }
    }

    // Handlers de eventos específicos

    private async onCheckoutCompleted(
        session: Stripe.Checkout.Session,
    ): Promise<void> {
        if (session.mode !== 'subscription' || !session.subscription) return;

        const subscriptionId =
            typeof session.subscription === 'string'
                ? session.subscription
                : session.subscription.id;

        const subscription =
            await this.stripeService.getSubscription(subscriptionId);

        const resolved =
            await this.workspaceSubscriptionService.resolveWorkspaceId(
                subscription,
            );

        if (!resolved) {
            this.logger.warn(
                `checkout.session.completed — no workspace found for subscription ${subscriptionId}`,
            );
            return;
        }

        await this.workspaceSubscriptionService.upsertSubscriptionFromStripe(
            resolved.workspaceId,
            resolved.subscriberUserId,
            subscription,
        );
    }

    private async onSubscriptionChanged(
        subscription: Stripe.Subscription,
    ): Promise<void> {
        const resolved =
            await this.workspaceSubscriptionService.resolveWorkspaceId(
                subscription,
            );

        if (!resolved) {
            this.logger.warn(
                `No workspace found for subscription ${subscription.id} | customer ${subscription.customer as string}`,
            );
            return;
        }

        const { workspaceId, subscriberUserId } = resolved;

        await this.workspaceSubscriptionService.upsertSubscriptionFromStripe(
            workspaceId,
            subscriberUserId,
            subscription,
        );
    }

    private async onPaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
        this.logger.log(
            `Payment succeeded for invoice ${invoice.id} | customer ${invoice.customer as string}`,
        );

        // Si la suscripción venía de incomplete → el webhook subscription.updated
        // ya se encargará de activarla. Aquí puedes registrar el pago en tu DB,
        // enviar un recibo por email, etc.
    }

    private async onPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
        this.logger.warn(
            `Payment failed for invoice ${invoice.id} | customer ${invoice.customer as string}`,
        );

        // Stripe reintentará el cobro según la configuración del dashboard.
        // Aquí puedes notificar al owner del workspace, bloquear features premium, etc.
        // Para encontrar el workspace: busca el User por stripeCustomerId y luego
        // los workspaces donde isSubscriber = true.
    }

    private async onTrialWillEnd(
        subscription: Stripe.Subscription,
    ): Promise<void> {
        // Stripe envía este evento 3 días antes de que termine el trial.
        const resolved =
            await this.workspaceSubscriptionService.resolveWorkspaceId(
                subscription,
            );

        if (!resolved) return;

        this.logger.log(
            `Trial will end for subscription ${subscription.id} | workspace ${resolved.workspaceId}`,
        );

        // Enviar email al owner del workspace notificando que el trial está por finalizar.
    }
}
