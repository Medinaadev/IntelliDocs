import { Controller, Get } from '@nestjs/common';
import { WorkspaceSubscriptionService } from './workspace-subscription.service';

@Controller('stripe')
export class StripePublicController {
    constructor(
        private readonly subscriptionService: WorkspaceSubscriptionService,
    ) {}

    @Get('prices')
    getPrices() {
        return this.subscriptionService.getPlanPrices();
    }
}
