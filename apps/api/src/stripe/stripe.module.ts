import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripePublicController } from './stripe-public.controller';
import { WorkspaceSubscriptionService } from './workspace-subscription.service';
import { PrismaService } from 'src/prisma.service';
import { STRIPE_CLIENT } from './stripe.constants';
import Stripe from 'stripe';

@Module({
    imports: [ConfigModule],
    controllers: [StripeWebhookController, StripePublicController],
    providers: [
        {
            provide: STRIPE_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return new Stripe(
                    configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
                    {
                        apiVersion: '2026-02-25.clover',
                    },
                );
            },
        },
        StripeService,
        WorkspaceSubscriptionService,
        PrismaService,
    ],
    exports: [StripeService, WorkspaceSubscriptionService],
})
export class StripeModule {}
