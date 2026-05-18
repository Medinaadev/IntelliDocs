import {
    Inject,
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import createPostgresSubscriber, { Subscriber } from 'pg-listen';
import { Subscription, interval } from 'rxjs';
import {
    ListenerDiscovery,
    PG_PUBSUB_CONFIG,
    PgPubSubConfig,
} from './pg-pubsub.types';
import {
    ListenerDiscoveryService,
    MessageProcessorService,
    PgConnectionPoolService,
    PgLockService,
    PgTriggerService,
    QueueService,
} from './services';

@Injectable()
export class PgPubSubService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PgPubSubService.name);

    private discovery!: ListenerDiscovery;
    private postgresSubscriber?: Subscriber;
    private pollingSubscription?: Subscription;

    constructor(
        @Inject(PG_PUBSUB_CONFIG)
        private readonly config: PgPubSubConfig,
        private readonly pgLockService: PgLockService,
        private readonly pgConnectionPoolService: PgConnectionPoolService,
        private readonly queueService: QueueService,
        private readonly triggerService: PgTriggerService,
        private readonly messageProcessorService: MessageProcessorService,
        private readonly listenerDiscoveryService: ListenerDiscoveryService,
    ) {}

    async onModuleInit(): Promise<void> {
        this.discovery =
            await this.listenerDiscoveryService.discoverListeners();

        await this.pgLockService.tryLock({
            key: 'pg_pubsub',
            duration: 5_000,
            onAccept: async () => {
                await this.queueService.setup();
                await this.triggerService.setupTriggers(this.discovery);
            },
            onReject: () =>
                this.logger.warn(
                    'Another instance is already updating PubSub triggers',
                ),
        });

        await this.resume();
    }

    async onModuleDestroy(): Promise<void> {
        this.pollingSubscription?.unsubscribe();
        this.queueService.teardown();
        await this.postgresSubscriber?.close();
    }

    async pause(): Promise<void> {
        this.pollingSubscription?.unsubscribe();
        this.pollingSubscription = undefined;

        await this.postgresSubscriber?.close();
        this.postgresSubscriber = undefined;

        this.logger.log('PostgreSQL listener paused');
    }

    async resume(): Promise<void> {
        return new Promise((resolve) => {
            const connectionConfig: any = {
                connectionString: this.config.databaseUrl,
            };

            if (this.config.ssl) {
                connectionConfig.ssl = this.config.ssl;
            }

            this.postgresSubscriber =
                this.postgresSubscriber ??
                createPostgresSubscriber(connectionConfig, {
                    retryInterval: (retryCount) =>
                        Math.min(1000 * 2 ** retryCount, 30000),
                    retryTimeout: Number.POSITIVE_INFINITY,
                });

            this.postgresSubscriber.events.on('error', (error) => {
                this.logger.error(error);
            });

            this.postgresSubscriber.events.on('connected', () => {
                this.logger.log('Connected to PostgreSQL');
                this.listenForChanges()
                    .then(() => resolve())
                    .catch((error) => {
                        this.logger.error(
                            'Error listening for changes:',
                            error,
                        );
                        resolve();
                    });
            });

            this.postgresSubscriber.events.on('reconnect', (attempt) => {
                this.logger.log(
                    `Reconnecting to PostgreSQL (attempt ${attempt})`,
                );
            });

            this.postgresSubscriber.connect().catch((error) => {
                this.logger.error('Error connecting to PostgreSQL:', error);
                resolve();
            });
        });
    }

    async suspendAndRun(action: () => Promise<void>): Promise<void> {
        await this.pause();
        try {
            await action();
        } finally {
            await this.resume();
        }
    }

    async subscribe<T>(
        channel: string,
        callback: (payload: T) => void,
    ): Promise<void> {
        await this.postgresSubscriber?.listenTo(channel);
        this.postgresSubscriber?.notifications.on(channel, callback);
    }

    async withTriggersDisabled<T>(
        callback: (
            query: <R = unknown>(
                sql: string,
                params?: unknown[],
            ) => Promise<R[]>,
        ) => Promise<T>,
    ): Promise<T> {
        const client = await this.pgConnectionPoolService.acquireClient();
        try {
            await client.query('BEGIN');
            await client.query("SET LOCAL pg_pubsub.disabled = 'true'");

            const queryFn = async <R = unknown>(
                sql: string,
                params?: unknown[],
            ): Promise<R[]> => {
                const result = await client.query(sql, params);
                return result.rows as R[];
            };

            const result = await callback(queryFn);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    private async listenForChanges(): Promise<void> {
        if (this.pollingSubscription) return;

        this.logger.log(
            `Watching triggers for tables:\n${this.discovery.tableNames.join(',\n')}`,
        );

        await this.messageProcessorService.pullAndProcessMessages(
            this.config.triggerPrefix!,
            this.discovery,
        );

        await this.subscribe<number>(this.config.triggerPrefix!, () => {
            this.messageProcessorService
                .pullAndProcessMessages(
                    this.config.triggerPrefix!,
                    this.discovery,
                )
                .catch((error) => {
                    this.logger.error('Error processing messages:', error);
                });
        });

        const fallbackInterval = 60_000;
        this.pollingSubscription = interval(fallbackInterval).subscribe(() => {
            this.messageProcessorService
                .pullAndProcessMessages(
                    this.config.triggerPrefix!,
                    this.discovery,
                )
                .catch((error) => {
                    this.logger.error(
                        'Error during fallback message polling:',
                        error,
                    );
                });
        });
    }
}
