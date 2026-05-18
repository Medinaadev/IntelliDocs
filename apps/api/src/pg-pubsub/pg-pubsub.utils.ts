import { getDMMF } from '@prisma/internals';
import * as fs from 'fs';
import * as path from 'path';
import { EntityMetadata, ColumnMetadata } from './pg-pubsub.types';

let dmmfCache: Awaited<ReturnType<typeof getDMMF>> | null = null;

async function getDMMFCached() {
    if (dmmfCache) return dmmfCache;

    const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
    const datamodel = fs.readFileSync(schemaPath, 'utf-8');
    dmmfCache = await getDMMF({ datamodel });
    return dmmfCache;
}

export async function getEntityMetadata(
    modelName: string,
): Promise<EntityMetadata> {
    const dmmf = await getDMMFCached();
    const model = dmmf.datamodel.models.find((m) => m.name === modelName);

    if (!model) {
        throw new Error(`Model "${modelName}" not found in Prisma DMMF`);
    }

    const columns: ColumnMetadata[] = model.fields
        .filter((f) => f.kind === 'scalar' || f.kind === 'enum')
        .map((f) => ({
            propertyName: f.name,
            databaseName: f.dbName ?? f.name,
            type: f.type,
            isNullable: !f.isRequired,
            isPrimary: f.isId,
            isGenerated:
                f.isGenerated ?? (f.default as any)?.name === 'autoincrement',
        }));

    return {
        name: model.name,
        tableName: model.dbName ?? model.name,
        columns,
        primaryColumns: columns.filter((c) => c.isPrimary),
    };
}

export function createEntity<T = unknown>(
    tableName: string,
    raw: Record<string, unknown>,
    tablesMap: Record<string, EntityMetadata>,
    columnNameToPropNames: Record<string, Map<string, string>>,
): T {
    const mappings = columnNameToPropNames[tableName];
    if (!mappings) return raw as T;

    return Object.entries(raw).reduce(
        (acc, [col, val]) => {
            const prop = mappings.get(col) ?? col;
            acc[prop] = val;
            return acc;
        },
        {} as Record<string, unknown>,
    ) as T;
}

export function hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return Math.abs(hash);
}

export function assertSafeIdentifier(value: string, context: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
        throw new Error(
            `Unsafe SQL identifier "${value}" in ${context}. Only alphanumeric characters and underscores are allowed.`,
        );
    }
}
