import { IsOptional, IsString } from 'class-validator';

export class SubscribeDto {
    @IsString()
    channel: string;

    @IsOptional()
    filters?: Record<string, string>;
}
