import { api } from '#/lib/api'

export type FileStatus = 'uploading' | 'processing' | 'ready' | 'error' | 'trashed'

export type ProcessingItem = {
    id: string
    name: string
    mimeType: string | null
    status: FileStatus
    createdAt: string
    content: {
        pageCount: number | null
        wordCount: number | null
        language: string | null
        extractedAt: string | null
        extractError: string | null
        metadata: Record<string, unknown> | null
    } | null
    activeVersion: {
        checksum: string | null
    } | null
}

export type ProcessingResponse = {
    items: ProcessingItem[]
}

export function fetchProcessingStatus(workspaceId: string) {
    return api.get<ProcessingResponse>(`/workspaces/${workspaceId}/processing`)
}
