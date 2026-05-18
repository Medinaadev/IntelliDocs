import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { PoolClient } from 'pg';
import {
    LockOptions,
    PG_PUBSUB_CONFIG,
    PgPubSubConfig,
} from '../pg-pubsub.types';
import { hashStringToInt } from '../pg-pubsub.utils';
import { PgConnectionPoolService } from './pg-connection-pool.service';

@Injectable()
export class PgLockService implements OnModuleDestroy {
    private readonly logger = new Logger(PgLockService.name);
    private readonly activeLocks = new Map<
        string,
        { timeout: NodeJS.Timeout; client: PoolClient }
    >();

    constructor(
        private readonly pgPool: PgConnectionPoolService,
        @Inject(PG_PUBSUB_CONFIG) private readonly config: PgPubSubConfig,
    ) {}

    async onModuleDestroy(): Promise<void> {
        for (const [key, { timeout, client }] of this.activeLocks) {
            clearTimeout(timeout);
            try {
                const lockId = hashStringToInt(key);
                await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
                client.release();
            } catch {
                // best-effort cleanup during shutdown
            }
        }
        this.activeLocks.clear();
    }

    async tryLock(options: LockOptions): Promise<void> {
        const { key, onAccept, onReject } = options;
        const duration =
            options.duration && options.duration > 0
                ? options.duration
                : 10_000;
        const lockId = hashStringToInt(key);
        let client: PoolClient | undefined;

        try {
            client = await this.pgPool.acquireClient();
            const lockResult = await client.query(
                'SELECT pg_try_advisory_lock($1) as acquired',
                [lockId],
            );

            if (lockResult.rows[0].acquired) {
                const existingLock = this.activeLocks.get(key);
                if (existingLock) {
                    clearTimeout(existingLock.timeout);
                    try {
                        await existingLock.client.query(
                            'SELECT pg_advisory_unlock($1)',
                            [lockId],
                        );
                        existingLock.client.release();
                    } catch {
                        // ignore errors releasing stale locks
                    }
                }

                const timeout = setTimeout(() => {
                    (async () => {
                        try {
                            await client?.query(
                                'SELECT pg_advisory_unlock($1)',
                                [lockId],
                            );
                        } catch (error) {
                            this.logger.error(
                                `Failed to release advisory lock for key ${key}`,
                                error,
                            );
                        } finally {
                            client?.release();
                            this.activeLocks.delete(key);
                        }
                    })().catch((error) => {
                        this.logger.error(
                            `Error in lock timeout handler for key ${key}`,
                            error,
                        );
                    });
                }, duration);

                this.activeLocks.set(key, { timeout, client });

                try {
                    await onAccept();
                } catch (error) {
                    clearTimeout(timeout);
                    this.activeLocks.delete(key);
                    try {
                        await client.query('SELECT pg_advisory_unlock($1)', [
                            lockId,
                        ]);
                    } catch {
                        // ignore unlock errors
                    }
                    client.release();
                    client = undefined;
                    await onReject?.(error);
                }

                return;
            }

            client.release();
            client = undefined;
            await onReject?.();
        } catch (error) {
            if (client && !this.activeLocks.has(key)) {
                try {
                    client.release();
                } catch {
                    // ignore release errors
                }
            }
            await onReject?.(error);
        }
    }
}
