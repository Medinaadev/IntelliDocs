import { Injectable, Logger } from '@nestjs/common';
import {
    ListenerDiscovery,
    PgTableChangeListener,
    PgTableChangePayload,
    PgTableChanges,
    PgTableDeletePayload,
    PgTableInsertPayload,
    PgTableUpdatePayload,
} from '../pg-pubsub.types';
import { createEntity } from '../pg-pubsub.utils';
import { QueueService } from './queue.service';

@Injectable()
export class MessageProcessorService {
    private readonly logger = new Logger(MessageProcessorService.name);
    private processing = false;
    private pendingPull = false;

    constructor(private readonly queueService: QueueService) {}

    async pullAndProcessMessages(
        channel: string,
        discovery: ListenerDiscovery,
    ): Promise<void> {
        if (this.processing) {
            this.pendingPull = true;
            return;
        }

        this.processing = true;

        try {
            do {
                this.pendingPull = false;
                await this.doPullAndProcess(channel, discovery);
            } while (this.pendingPull);
        } finally {
            this.processing = false;
        }
    }

    private async doPullAndProcess(
        channel: string,
        discovery: ListenerDiscovery,
    ): Promise<void> {
        try {
            const messages =
                await this.queueService.fetchPendingMessages(channel);

            if (messages.length === 0) return;

            this.logger.log(
                `Processing ${messages.length} messages from queue for channel ${channel}`,
            );

            const payloads: PgTableChangePayload[] = [];

            for (const message of messages) {
                try {
                    const payload =
                        message.payload as PgTableChangePayload<unknown>;
                    payload.id = message.id;
                    payload._metadata = {
                        retry_count: message.retry_count,
                        created_at: message.created_at,
                    };

                    switch (payload.event) {
                        case 'INSERT': {
                            const insert = payload;
                            insert.data = createEntity(
                                insert.table,
                                insert.data as Record<string, unknown>,
                                discovery.tablesMap,
                                discovery.columnNameToPropNames,
                            );
                            payloads.push(insert);
                            break;
                        }
                        case 'UPDATE': {
                            const update = payload;
                            const oldData = createEntity(
                                update.table,
                                update.data.old as Record<string, unknown>,
                                discovery.tablesMap,
                                discovery.columnNameToPropNames,
                            );
                            const newData = createEntity(
                                update.table,
                                update.data.new as Record<string, unknown>,
                                discovery.tablesMap,
                                discovery.columnNameToPropNames,
                            );
                            update.data = {
                                new: newData,
                                old: oldData,
                                updatedFields: Object.keys(
                                    oldData as Record<string, unknown>,
                                ).filter(
                                    (key) =>
                                        typeof (
                                            oldData as Record<string, unknown>
                                        )[key] !== 'object' &&
                                        (oldData as Record<string, unknown>)[
                                            key
                                        ] !==
                                            (
                                                newData as Record<
                                                    string,
                                                    unknown
                                                >
                                            )[key],
                                ),
                            };
                            payloads.push(update);
                            break;
                        }
                        case 'DELETE': {
                            const deletion = payload;
                            deletion.data = createEntity(
                                deletion.table,
                                deletion.data as Record<string, unknown>,
                                discovery.tablesMap,
                                discovery.columnNameToPropNames,
                            );
                            payloads.push(deletion);
                            break;
                        }
                    }
                } catch (error) {
                    this.logger.error(
                        `Error processing message ${message.id}:`,
                        error,
                    );
                    await this.queueService.markAsFailed([message.id]);
                }
            }

            await this.processChanges(payloads, discovery.listenersMap);
        } catch (error) {
            this.logger.error('Error pulling messages:', error);
        }
    }

    private async processChanges<T>(
        payloads: PgTableChangePayload<T>[],
        listenersMap: Record<string, PgTableChangeListener<unknown>[]>,
    ): Promise<void> {
        payloads = payloads.sort((a, b) => a.id - b.id);

        const groupByTable = payloads.reduce(
            (acc, change) => {
                if (!acc[change.table]) acc[change.table] = [];
                acc[change.table].push(change);
                return acc;
            },
            {} as Record<string, PgTableChangePayload[]>,
        );

        const promises: Promise<void>[] = [];
        const failedIds: number[] = [];

        for (const [table, changes] of Object.entries(groupByTable)) {
            const listeners = listenersMap[table] ?? [];

            const inserts = changes.filter(
                (c) => c.event === 'INSERT',
            ) as PgTableInsertPayload<T>[];
            const updates = changes.filter(
                (c) => c.event === 'UPDATE',
            ) as PgTableUpdatePayload<T>[];
            const deletes = changes.filter(
                (c) => c.event === 'DELETE',
            ) as PgTableDeletePayload<T>[];

            listeners.forEach((listener) => {
                promises.push(
                    listener
                        .process(
                            {
                                all: changes,
                                INSERT: inserts,
                                UPDATE: updates,
                                DELETE: deletes,
                            } as PgTableChanges<unknown>,
                            (ids) => failedIds.push(...ids),
                        )
                        .catch((error) => {
                            this.logger.error(
                                `Error processing changes for table ${table}:`,
                                error,
                            );
                        }),
                );
            });
        }

        await Promise.all(promises);

        await this.queueService.markAsProcessed(
            payloads.filter((p) => !failedIds.includes(p.id)).map((p) => p.id),
        );

        if (failedIds.length > 0) {
            await this.queueService.markAsFailed(failedIds);
        }
    }
}
