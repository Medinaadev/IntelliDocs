import { queryOptions } from '@tanstack/react-query'
import { api } from '#/lib/api'

export type TrashAuthor = {
    id: string
    name: string
    image: string | null
}

export type TrashedFolder = {
    type: 'folder'
    id: string
    name: string
    color: string | null
    parentId: string | null
    trashedAt: string
    trashedBy: TrashAuthor | null
}

export type TrashedFile = {
    type: 'file'
    id: string
    name: string
    folderId: string | null
    mimeType: string | null
    size: string | null
    trashedAt: string
    trashedBy: TrashAuthor | null
}

export type TrashedItem = TrashedFolder | TrashedFile

export type TrashResponse = {
    folders: TrashedFolder[]
    files: TrashedFile[]
    totalCount: number
}

export const trashQuery = (workspaceId: string) =>
    queryOptions({
        queryKey: ['trash', workspaceId],
        queryFn: () =>
            api.get<TrashResponse>(
                `/workspaces/${workspaceId}/drive/trash`,
            ),
    })
