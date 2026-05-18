import { Inject, Injectable } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import {
    DiscoveredPgTableChangeListener,
    EntityMetadata,
    ListenerDiscovery,
    PG_PUBSUB_CONFIG,
    PG_PUBSUB_TRIGGER_SCHEMA,
    PgPubSubConfig,
    PgTableChangeListener,
    RegisterPgTableChangeListenerMeta,
    RegisterPgTableChangeListenerMetadata,
    TableListener,
} from '../pg-pubsub.types';
import { getEntityMetadata } from '../pg-pubsub.utils';

@Injectable()
export class ListenerDiscoveryService {
    constructor(
        private readonly discoveryService: DiscoveryService,
        private readonly reflector: Reflector,
        @Inject(PG_PUBSUB_CONFIG) private readonly config: PgPubSubConfig,
    ) {}

    async discoverListeners(): Promise<ListenerDiscovery> {
        const providers = this.discoveryService
            .getProviders()
            .filter((wrapper) => {
                if (!wrapper.metatype) return false;
                const meta = this.reflector.get(
                    RegisterPgTableChangeListenerMeta,
                    wrapper.metatype,
                );
                return !!meta;
            })
            .map((wrapper) => ({
                meta: this.reflector.get<RegisterPgTableChangeListenerMetadata>(
                    RegisterPgTableChangeListenerMeta,
                    wrapper.metatype!,
                ),
                discoveredClass: {
                    instance:
                        wrapper.instance as PgTableChangeListener<unknown>,
                },
            })) as DiscoveredPgTableChangeListener[];

        return this.processDiscoveredListeners(providers);
    }

    private async processDiscoveredListeners(
        providers: DiscoveredPgTableChangeListener[],
    ): Promise<ListenerDiscovery> {
        const listeners: TableListener[] = [];
        const listenersMap: Record<string, PgTableChangeListener<unknown>[]> =
            {};
        const tablesMap: Record<string, EntityMetadata> = {};
        const columnNameToPropNames: Record<string, Map<string, string>> = {};
        const propNameToColumnNames: Record<string, Map<string, string>> = {};
        const entityMetadataList: EntityMetadata[] = [];

        for (const provider of providers) {
            const metadata = await getEntityMetadata(
                provider.meta.modelName as string,
            );
            const { tableName } = metadata;

            entityMetadataList.push(metadata);

            if (!columnNameToPropNames[tableName]) {
                columnNameToPropNames[tableName] = new Map(
                    metadata.columns.map((c) => [
                        c.databaseName,
                        c.propertyName,
                    ]),
                );
                propNameToColumnNames[tableName] = new Map(
                    metadata.columns.map((c) => [
                        c.propertyName,
                        c.databaseName,
                    ]),
                );
                tablesMap[tableName] = metadata;
            }

            const existing = listeners.find((l) => l.table === tableName);
            if (existing) {
                existing.schema =
                    provider.meta.schema ??
                    existing.schema ??
                    this.config.triggerSchema ??
                    PG_PUBSUB_TRIGGER_SCHEMA;
                existing.events = [
                    ...new Set([
                        ...(existing.events ?? []),
                        ...(provider.meta.events ?? []),
                    ]),
                ];
                existing.payloadFields = [
                    ...new Set([
                        ...(existing.payloadFields ?? []),
                        ...((provider.meta.payloadFields as string[]) ?? []),
                    ]),
                ];
            } else {
                listeners.push({
                    table: tableName,
                    schema:
                        provider.meta.schema ??
                        this.config.triggerSchema ??
                        PG_PUBSUB_TRIGGER_SCHEMA,
                    events: provider.meta.events,
                    payloadFields: provider.meta.payloadFields as string[],
                });
            }

            listenersMap[tableName] = [
                ...(listenersMap[tableName] ?? []),
                provider.discoveredClass.instance,
            ];
        }

        return {
            tablesMap,
            tableNames: listeners.map((l) => l.table),
            listeners,
            listenersMap,
            entityMetadataList,
            columnNameToPropNames,
            propNameToColumnNames,
        };
    }
}
