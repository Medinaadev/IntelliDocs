import { queryOptions } from '@tanstack/react-query'
import { api } from '#/lib/api'
import type { GetDriveContentResponse } from '@intellidocs/types'

export const driveContentQuery = (
    workspaceId: string,
    folderId: string | null | undefined,
    q?: string,
    tagId?: string,
) =>
    queryOptions({
        queryKey: ['drive', workspaceId, folderId ?? null, q ?? '', tagId ?? ''],
        queryFn: () => {
            const params = new URLSearchParams()
            if (folderId) params.set('parentId', folderId)
            if (q) params.set('q', q)
            if (tagId) params.set('tagId', tagId)
            return api.get<GetDriveContentResponse>(
                `/workspaces/${workspaceId}/drive?${params}`,
            )
        },
    })
