import { IsEnum, IsString } from 'class-validator';

export class CreateSubscriptionCheckoutDto {
    @IsEnum(['pro', 'enterprise'])
    plan: 'pro' | 'enterprise';

    @IsString()
    successUrl: string;

    @IsString()
    cancelUrl: string;
}
