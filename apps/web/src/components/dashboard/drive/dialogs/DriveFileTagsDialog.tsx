import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '#/lib/api'
import { tagsQuery } from '#/lib/queries/tags'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import type { DriveFileItem } from '@intellidocs/types'
import { Loader2, Tag, Plus, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: DriveFileItem
    workspaceId: string
}

export function DriveFileTagsDialog({ open, onOpenChange, item, workspaceId }: Props) {
    const queryClient = useQueryClient()
    const [pending, setPending] = useState<string | null>(null)

    const { data: allTags, isLoading: loadingAll } = useQuery(tagsQuery(workspaceId))
    const { data: fileTags, isLoading: loadingFile } = useQuery({
        queryKey: ['file-tags', workspaceId, item.id],
        queryFn: () =>
            api.get<{ id: string; name: string; color: string | null }[]>(
                `/workspaces/${workspaceId}/drive/files/${item.id}/tags`,
            ),
        enabled: open,
    })

    const assignedIds = new Set(fileTags?.map((t) => t.id) ?? [])

    const toggle = async (tagId: string) => {
        setPending(tagId)
        try {
            if (assignedIds.has(tagId)) {
                await api.delete(`/workspaces/${workspaceId}/drive/files/${item.id}/tags/${tagId}`)
            } else {
                await api.post(`/workspaces/${workspaceId}/drive/files/${item.id}/tags`, { tagId })
            }
            queryClient.invalidateQueries({ queryKey: ['file-tags', workspaceId, item.id] })
            queryClient.invalidateQueries({ queryKey: ['tags', workspaceId] })
            queryClient.invalidateQueries({ queryKey: ['drive', workspaceId] })
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error')
        } finally {
            setPending(null)
        }
    }

    const isLoading = loadingAll || loadingFile

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader className="border-b border-b-black/10 dark:border-b-white/10 pb-3">
                    <DialogTitle className="flex items-center gap-2">
                        <Tag size={16} />
                        Etiquetas — {item.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : allTags?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            No hay etiquetas en este workspace. Crea una en la sección de Etiquetas.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            {allTags?.map((tag) => {
                                const assigned = assignedIds.has(tag.id)
                                const loading = pending === tag.id
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        disabled={loading}
                                        onClick={() => toggle(tag.id)}
                                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left disabled:opacity-60"
                                    >
                                        <span
                                            className="size-3 rounded-full shrink-0"
                                            style={{ background: tag.color ?? '#94a3b8' }}
                                        />
                                        <span className="text-[13px] font-medium flex-1">{tag.name}</span>
                                        <span className="size-5 flex items-center justify-center shrink-0">
                                            {loading ? (
                                                <Loader2 size={13} className="animate-spin text-muted-foreground" />
                                            ) : assigned ? (
                                                <Check size={13} className="text-green-500" />
                                            ) : (
                                                <Plus size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
                                            )}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
