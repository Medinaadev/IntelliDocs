import { queryOptions } from '@tanstack/react-query'
import { api } from '#/lib/api'

export type AuditLogEntry = {
    id: string
    action: string
    entityType: 'file' | 'folder'
    entityId: string
    entityName: string | null
    metadata: Record<string, unknown> | null
    createdAt: string
    user: {
        id: string
        name: string
        image: string | null
    }
}

export type ActivityResponse = {
    items: AuditLogEntry[]
    nextCursor: string | null
}

export const activityQuery = (workspaceId: string) =>
    queryOptions({
        queryKey: ['activity', workspaceId],
        queryFn: () =>
            api.get<ActivityResponse>(
                `/workspaces/${workspaceId}/activity?limit=50`,
            ),
    })
