import { Prisma } from 'src/generated/prisma/client';
import { PgTableChangeType, PgTableChanges } from '@intellidocs/types';
export {
    PgTableInsertPayload,
    PgTableUpdatePayload,
    PgTableDeletePayload,
    PgTableChangePayload,
    PgTableChangeType,
    PgTableChanges,
} from '@intellidocs/types';

export const PG_PUBSUB_TRIGGER_NAME = 'pubsub_trigger';
export const PG_PUBSUB_TRIGGER_SCHEMA = 'public';
export const PG_PUBSUB_QUEUE_SCHEMA = 'public';
export const PG_PUBSUB_QUEUE_TABLE = 'pg_pubsub_queue';
export const PG_PUBSUB_QUEUE_MESSAGE_TTL = 24 * 60 * 60 * 1000;
export const PG_PUBSUB_QUEUE_MAX_RETRIES = 5;
export const PG_PUBSUB_QUEUE_CLEANUP_INTERVAL = 60 * 60 * 1000;
export const PG_PUBSUB_QUEUE_BATCH_SIZE = 100;

export const PG_PUBSUB_CONFIG = Symbol('PG_PUBSUB_CONFIG');
export const RegisterPgTableChangeListenerMeta = Symbol(
    'RegisterPgTableChangeListenerMeta',
);

// ---- Payloads ----

export type PgTableChangeErrorHandler = (ids: number[]) => void;

export interface PgTableChangeListener<TRow> {
    process(
        changes: PgTableChanges<TRow>,
        onError?: PgTableChangeErrorHandler,
    ): Promise<void>;
}

// ---- Entity metadata (reemplaza EntityMetadata de TypeORM) ----

export interface ColumnMetadata {
    propertyName: string;
    databaseName: string;
    type: string;
    isNullable: boolean;
    isPrimary: boolean;
    isGenerated: boolean;
}

export interface EntityMetadata {
    name: string;
    tableName: string;
    columns: ColumnMetadata[];
    primaryColumns: ColumnMetadata[];
}

// ---- Listener discovery ----

export type RegisterPgTableChangeListenerMetadata<T = unknown> = {
    modelName: keyof typeof Prisma.ModelName;
    schema?: string;
    events?: PgTableChangeType[];
    payloadFields?: (keyof T)[];
};

export type DiscoveredPgTableChangeListener = {
    meta: RegisterPgTableChangeListenerMetadata;
    discoveredClass: { instance: PgTableChangeListener<unknown> };
};

export interface TableListener {
    events?: PgTableChangeType[];
    table: string;
    schema: string;
    payloadFields?: string[];
}

export interface ListenerDiscovery {
    tablesMap: Record<string, EntityMetadata>;
    tableNames: string[];
    listeners: TableListener[];
    listenersMap: Record<string, PgTableChangeListener<unknown>[]>;
    entityMetadataList: EntityMetadata[];
    columnNameToPropNames: Record<string, Map<string, string>>;
    propNameToColumnNames: Record<string, Map<string, string>>;
}

export interface TriggerMetadata {
    name: string;
    table: string;
    schema: string;
    events?: PgTableChangeType[];
    payloadFields?: string[];
    hash?: string;
}

export interface LockOptions {
    key: string;
    duration: number;
    onAccept: () => Promise<void> | void;
    onReject?: (error?: unknown) => Promise<void> | void;
}

export interface QueuedMessage<T = unknown> {
    id: number;
    channel: string;
    payload: T;
    created_at: Date;
    processed_at: Date | null;
    retry_count: number;
    next_retry_at: Date | null;
    status: MessageStatus;
}

export enum MessageStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    PROCESSED = 'processed',
    FAILED = 'failed',
}

export interface QueueConfig {
    schema?: string;
    table?: string;
    maxRetries?: number;
    messageTTL?: number;
    cleanupInterval?: number;
    batchSize?: number;
}

export interface PoolConfig {
    max?: number;
}

export interface PgPubSubConfig {
    databaseUrl: string;
    ssl?: unknown;
    triggerSchema?: string;
    triggerPrefix?: string;
    queue?: QueueConfig;
    pool?: PoolConfig;
}
