import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import {
    PG_PUBSUB_CONFIG,
    PgPubSubConfig,
    PG_PUBSUB_TRIGGER_NAME,
} from './pg-pubsub.types';
import { PgPubSubService } from './pg-pubsub.service';
import {
    ListenerDiscoveryService,
    MessageProcessorService,
    PgConnectionPoolService,
    PgLockService,
    PgTriggerService,
    QueueService,
} from './services';

@Module({})
export class PgPubSubModule {
    static forRoot(config: PgPubSubConfig): DynamicModule {
        return {
            module: PgPubSubModule,
            global: true,
            imports: [DiscoveryModule],
            providers: [
                {
                    provide: PG_PUBSUB_CONFIG,
                    useValue: {
                        triggerPrefix: PG_PUBSUB_TRIGGER_NAME,
                        ...config,
                    },
                },
                PgConnectionPoolService,
                PgLockService,
                QueueService,
                PgTriggerService,
                MessageProcessorService,
                ListenerDiscoveryService,
                PgPubSubService,
            ],
            exports: [PgPubSubService],
        };
    }
}
