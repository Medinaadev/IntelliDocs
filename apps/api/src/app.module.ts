import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './tasks/cleanup.service';
import { PrismaService } from './prisma.service';
import { PgPubSubModule } from './pg-pubsub/pg-pubsub.module';
import { StripeModule } from './stripe/stripe.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StorageModule } from './storage/storage.module';
import { BullModule } from '@nestjs/bullmq';
import { ProcessingModule } from './processing/processing.module';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL as string;
const redisTls = redisUrl?.startsWith('rediss://')
    ? { tls: { rejectUnauthorized: false } }
    : {};

function makeRedis(extra: object = {}) {
    return new Redis(redisUrl, { family: 0, ...redisTls, ...extra });
}

@Module({
    imports: [
        ConfigModule.forRoot(),
        ThrottlerModule.forRoot({
            throttlers: [
                {
                    name: 'short',
                    ttl: seconds(1),
                    limit: 5,
                },
                {
                    name: 'medium',
                    ttl: seconds(20),
                    limit: 100,
                },
                {
                    name: 'long',
                    ttl: seconds(60),
                    limit: 300,
                },
            ],
            errorMessage: 'Too many requests. Please try again later.',
            storage: new ThrottlerStorageRedisService(makeRedis()),
        }),
        ScheduleModule.forRoot(),
        BullModule.forRoot({
            connection: makeRedis({ maxRetriesPerRequest: null }),
        }),
        PgPubSubModule.forRoot({
            databaseUrl: process.env.DATABASE_URL as string,
            triggerPrefix: 'pubsub_trigger',
            queue: {
                maxRetries: 5,
                messageTTL: 24 * 60 * 60 * 1000,
            },
        }),
        RealtimeModule,
        StorageModule,
        AuthModule,
        UsersModule,
        StripeModule,
        WorkspacesModule,
        ProcessingModule,
    ],
    controllers: [],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        PrismaService,
        CleanupService,
    ],
})
export class AppModule {}
