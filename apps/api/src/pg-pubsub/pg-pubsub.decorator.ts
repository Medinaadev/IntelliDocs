import { SetMetadata } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import {
    RegisterPgTableChangeListenerMeta,
    RegisterPgTableChangeListenerMetadata,
    PgTableChangeType,
} from './pg-pubsub.types';

export const RegisterPgTableChangeListener = <T = unknown>(
    modelName: keyof typeof Prisma.ModelName,
    params?: {
        schema?: string;
        events?: PgTableChangeType[];
        payloadFields?: (keyof T)[];
        columnMappings?: Record<string, string>;
    },
) =>
    SetMetadata<symbol, RegisterPgTableChangeListenerMetadata<T>>(
        RegisterPgTableChangeListenerMeta,
        {
            modelName,
            ...params,
        },
    );
