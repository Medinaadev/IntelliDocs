import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './stripe.constants';

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);

    constructor(
        @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
        private readonly configService: ConfigService,
    ) {}

    // Customers

    async createCustomer(
        email: string,
        name: string,
        metadata?: Stripe.Emptyable<Stripe.MetadataParam>,
    ): Promise<Stripe.Customer> {
        return this.stripe.customers.create({ email, name, metadata });
    }

    async getCustomer(customerId: string): Promise<Stripe.Customer> {
        return this.stripe.customers.retrieve(
            customerId,
        ) as Promise<Stripe.Customer>;
    }

    // Subscriptions

    async createSubscription(
        customerId: string,
        priceId: string,
        options?: Partial<Stripe.SubscriptionCreateParams>,
    ): Promise<Stripe.Subscription> {
        return this.stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: {
                save_default_payment_method: 'on_subscription',
            },
            expand: ['latest_invoice.confirmation_secret'],
            ...options,
        });
    }

    async getSubscription(
        subscriptionId: string,
    ): Promise<Stripe.Subscription> {
        return this.stripe.subscriptions.retrieve(subscriptionId);
    }

    async getPrice(priceId: string): Promise<Stripe.Price> {
        return this.stripe.prices.retrieve(priceId);
    }

    async getActivePriceByProduct(productId: string): Promise<Stripe.Price | null> {
        const list = await this.stripe.prices.list({
            product: productId,
            active: true,
            limit: 1,
        });
        return list.data[0] ?? null;
    }

    async listActiveSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
        const list = await this.stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 10,
        });
        return list.data;
    }

    async cancelSubscription(
        subscriptionId: string,
    ): Promise<Stripe.Subscription> {
        return this.stripe.subscriptions.cancel(subscriptionId);
    }

    async scheduleCancel(subscriptionId: string): Promise<Stripe.Subscription> {
        return this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
    }

    async undoScheduleCancel(subscriptionId: string): Promise<Stripe.Subscription> {
        return this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });
    }

    async updateSubscription(
        subscriptionId: string,
        newPriceId: string,
    ): Promise<Stripe.Subscription> {
        const subscription = await this.getSubscription(subscriptionId);
        return this.stripe.subscriptions.update(subscriptionId, {
            items: [
                {
                    id: subscription.items.data[0].id,
                    price: newPriceId,
                },
            ],
            proration_behavior: 'create_prorations', // cobra/acredita diferencia
        });
    }

    // Billing Portal

    async createBillingPortalSession(
        customerId: string,
        returnUrl: string,
    ): Promise<Stripe.BillingPortal.Session> {
        return this.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });
    }

    // Checkout Session

    async createCheckoutSession(
        customerId: string,
        priceId: string,
        successUrl: string,
        cancelUrl: string,
        metadata?: Record<string, string>,
    ): Promise<Stripe.Checkout.Session> {
        return this.stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            subscription_data: { metadata: metadata ?? {} },
        });
    }

    // Webhook validation

    constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
        const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
        if (!secret) {
            throw new Error('Stripe webhook secret not configured');
        }
        return this.stripe.webhooks.constructEvent(payload, signature, secret);
    }
}
