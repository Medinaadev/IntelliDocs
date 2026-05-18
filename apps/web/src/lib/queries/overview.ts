import { queryOptions } from '@tanstack/react-query'
import { api } from '#/lib/api'

export type OverviewRecentFile = {
    id: string
    name: string
    mimeType: string | null
    size: string | null
    folderId: string | null
    updatedAt: string
    versionNumber: number
    tags: { id: string; name: string; color: string | null }[]
    uploadedBy: { id: string; name: string; image: string | null } | null
}

export type WorkspaceOverview = {
    fileCount: number
    folderCount: number
    memberCount: number
    tagCount: number
    storageUsed: number
    storageLimit: number
    plan: string
    recentFiles: OverviewRecentFile[]
    topTags: { id: string; name: string; color: string | null; fileCount: number }[]
}

export const overviewQuery = (workspaceId: string) =>
    queryOptions({
        queryKey: ['overview', workspaceId],
        queryFn: () =>
            api.get<WorkspaceOverview>(`/workspaces/${workspaceId}/overview`),
        staleTime: 30_000,
    })
