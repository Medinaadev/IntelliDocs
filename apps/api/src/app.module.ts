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

@Module({
    imports: [
        ConfigModule.forRoot(),
        ThrottlerModule.forRoot({
            throttlers: [
                {
                    name: 'short',
                    ttl: seconds(1),
                    limit: 5, // 5 solicitudes por segundo
                },

                {
                    name: 'medium',
                    ttl: seconds(20), // 20 segundos
                    limit: 100, // 100 solicitudes por 30 segundos
                },

                {
                    name: 'long',
                    ttl: seconds(60), // 1 minuto
                    limit: 300, // 300 solicitudes por minuto
                },
            ],
            errorMessage: 'Too many requests. Please try again later.',
            storage: new ThrottlerStorageRedisService(),
        }),
        ScheduleModule.forRoot(),
        // Conexión global de BullMQ con Redis
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
                password: process.env.REDIS_PASSWORD || undefined,
                username: process.env.REDIS_USERNAME || undefined,
            },
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
