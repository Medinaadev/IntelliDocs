import {
    Inject,
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { PG_PUBSUB_CONFIG, PgPubSubConfig } from '../pg-pubsub.types';

@Injectable()
export class PgConnectionPoolService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PgConnectionPoolService.name);
    private pool!: Pool;

    constructor(
        @Inject(PG_PUBSUB_CONFIG)
        private readonly config: PgPubSubConfig,
    ) {}

    onModuleInit(): void {
        const poolConfig: PoolConfig = {
            connectionString: this.config.databaseUrl,
            max: this.config.pool?.max ?? 2,
        };

        if (this.config.ssl) {
            poolConfig.ssl = this.config.ssl;
        }

        this.pool = new Pool(poolConfig);

        this.pool.on('error', (err) => {
            this.logger.error('Unexpected error on idle pg client', err);
        });

        this.logger.log('PostgreSQL connection pool initialized');
    }

    async onModuleDestroy(): Promise<void> {
        await this.pool.end();
        this.logger.log('PostgreSQL connection pool closed');
    }

    acquireClient(): Promise<PoolClient> {
        return this.pool.connect();
    }

    async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return result.rows as T[];
        } finally {
            client.release();
        }
    }
}
