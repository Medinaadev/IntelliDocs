import { queryOptions } from '@tanstack/react-query'
import { api } from '#/lib/api'

export type WorkspaceTag = {
    id: string
    name: string
    color: string | null
    fileCount: number
    createdAt: string
}

export const tagsQuery = (workspaceId: string) =>
    queryOptions({
        queryKey: ['tags', workspaceId],
        queryFn: () => api.get<WorkspaceTag[]>(`/workspaces/${workspaceId}/tags`),
    })

export const fileTagsQuery = (workspaceId: string, fileId: string) =>
    queryOptions({
        queryKey: ['file-tags', workspaceId, fileId],
        queryFn: () =>
            api.get<{ id: string; name: string; color: string | null }[]>(
                `/workspaces/${workspaceId}/drive/files/${fileId}/tags`,
            ),
    })
