import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tagsQuery, type WorkspaceTag } from '#/lib/queries/tags'
import { api } from '#/lib/api'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import { HexColorPicker } from 'react-colorful'
import {
    Edit2,
    FileIcon,
    Loader2,
    Plus,
    Tag,
    Trash2,
    X,
} from 'lucide-react'
import { formatFileSize } from '#/lib/file-size'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/dashboard/$workspaceId/labels/')({
    component: RouteComponent,
})

// dialogo para crear o editar un tag

function TagFormDialog({
    open,
    onOpenChange,
    workspaceId,
    tag,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    workspaceId: string
    tag?: WorkspaceTag
}) {
    const isEdit = !!tag
    const [name, setName] = useState(tag?.name ?? '')
    const [color, setColor] = useState<string | undefined>(tag?.color ?? undefined)
    const [loading, setLoading] = useState(false)
    const queryClient = useQueryClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) return
        setLoading(true)
        const toastId = toast.loading(isEdit ? 'Guardando...' : 'Creando etiqueta...')
        try {
            if (isEdit) {
                await api.patch(`/workspaces/${workspaceId}/tags/${tag!.id}`, {
                    name: trimmed,
                    color: color ?? null,
                })
            } else {
                await api.post(`/workspaces/${workspaceId}/tags`, {
                    name: trimmed,
                    color: color ?? null,
                })
            }
            toast.success(isEdit ? 'Etiqueta actualizada' : 'Etiqueta creada', { id: toastId })
            queryClient.invalidateQueries({ queryKey: ['tags', workspaceId] })
            onOpenChange(false)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error', { id: toastId })
        } finally {
            setLoading(false)
        }
    }

    const handleOpenChange = (v: boolean) => {
        if (v) {
            setName(tag?.name ?? '')
            setColor(tag?.color ?? undefined)
        }
        onOpenChange(v)
    }

    const preview = name.trim() || 'Vista previa'

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="border-b border-b-black/10 dark:border-b-white/10 pb-3">
                        <DialogTitle className="flex items-center gap-2">
                            <Tag size={15} />
                            {isEdit ? 'Editar etiqueta' : 'Nueva etiqueta'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="mt-5 flex flex-col gap-5">
                        <div className="grid gap-2">
                            <Label>Nombre</Label>
                            <Input
                                autoFocus
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej. Urgente, Contrato, Revisión…"
                                maxLength={50}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Color (opcional)</Label>
                            <HexColorPicker
                                color={color ?? '#6366f1'}
                                onChange={setColor}
                                style={{ width: '100%' }}
                            />
                            {color && (
                                <button
                                    type="button"
                                    onClick={() => setColor(undefined)}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
                                >
                                    <X size={12} /> Quitar color
                                </button>
                            )}
                        </div>

                        {/* preview del tag con el color elegido */}
                        <div className="grid gap-2">
                            <Label className="text-muted-foreground">Vista previa</Label>
                            <div className="flex items-center gap-2">
                                <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium"
                                    style={{
                                        background: color ? `${color}18` : 'rgba(148,163,184,0.12)',
                                        color: color ?? '#64748b',
                                        border: `1px solid ${color ?? '#94a3b8'}35`,
                                    }}
                                >
                                    <span
                                        className="size-1.5 rounded-full shrink-0"
                                        style={{ background: color ?? '#94a3b8' }}
                                    />
                                    {preview}
                                </span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-5">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !name.trim()}>
                            {loading && <Loader2 size={13} className="animate-spin" />}
                            {isEdit ? 'Guardar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// dialogo de confirmacion para borrar

function DeleteTagDialog({
    open,
    onOpenChange,
    workspaceId,
    tag,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    workspaceId: string
    tag: WorkspaceTag
}) {
    const [loading, setLoading] = useState(false)
    const queryClient = useQueryClient()

    const handleDelete = async () => {
        setLoading(true)
        const toastId = toast.loading('Eliminando etiqueta...')
        try {
            await api.delete(`/workspaces/${workspaceId}/tags/${tag.id}`)
            toast.success('Etiqueta eliminada', { id: toastId })
            queryClient.invalidateQueries({ queryKey: ['tags', workspaceId] })
            onOpenChange(false)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error', { id: toastId })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader className="border-b border-b-black/10 dark:border-b-white/10 pb-3">
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 size={15} />
                        Eliminar etiqueta
                    </DialogTitle>
                </DialogHeader>
                <div className="mt-5 flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                        ¿Eliminar{' '}
                        <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium"
                            style={{
                                background: tag.color ? `${tag.color}18` : 'rgba(148,163,184,0.12)',
                                color: tag.color ?? '#64748b',
                                border: `1px solid ${tag.color ?? '#94a3b8'}35`,
                            }}
                        >
                            {tag.name}
                        </span>
                        ? Se quitará de los{' '}
                        <span className="font-medium text-foreground">
                            {tag.fileCount} {tag.fileCount === 1 ? 'archivo' : 'archivos'}
                        </span>{' '}
                        que la tienen.
                    </p>
                </div>
                <DialogFooter className="mt-5">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" disabled={loading} onClick={handleDelete}>
                        {loading && <Loader2 size={13} className="animate-spin" />}
                        Eliminar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// fila de cada tag en la lista

function TagRow({
    tag,
    workspaceId,
    onEdit,
    onDelete,
}: {
    tag: WorkspaceTag
    workspaceId: string
    onEdit: (tag: WorkspaceTag) => void
    onDelete: (tag: WorkspaceTag) => void
}) {
    const navigate = useNavigate()

    return (
        <div
            className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/4 dark:hover:bg-white/4 transition-colors cursor-pointer"
            onClick={() =>
                navigate({
                    to: '/dashboard/$workspaceId/drive',
                    params: { workspaceId },
                    search: { tagId: tag.id },
                })
            }
        >
            {/* pill con el mismo estilo que en los archivos */}
            <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium shrink-0 select-none"
                style={{
                    background: tag.color ? `${tag.color}18` : 'rgba(148,163,184,0.10)',
                    color: tag.color ?? '#64748b',
                    border: `1px solid ${tag.color ?? '#94a3b8'}35`,
                }}
            >
                <span
                    className="size-1.5 rounded-full shrink-0"
                    style={{ background: tag.color ?? '#94a3b8' }}
                />
                {tag.name}
            </span>

            {/* empuja las acciones a la derecha */}
            <span className="flex-1 min-w-0" />

            {/* numero de archivos con este tag */}
            <span className="text-[12px] text-muted-foreground/60 tabular-nums shrink-0 group-hover:opacity-0 transition-opacity">
                {tag.fileCount} {tag.fileCount === 1 ? 'archivo' : 'archivos'}
            </span>

            {/* botones absolute para no romper el layout del conteo */}
            <div className="absolute right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    type="button"
                    className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-black/8 dark:hover:bg-white/8 transition-colors"
                    title="Editar"
                    onClick={(e) => { e.stopPropagation(); onEdit(tag) }}
                >
                    <Edit2 size={13} />
                </button>
                <button
                    type="button"
                    className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
                    title="Eliminar"
                    onClick={(e) => { e.stopPropagation(); onDelete(tag) }}
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    )
}

// skeleton mientras carga

function TagRowSkeleton() {
    return (
        <div className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="h-6 w-20 rounded-full" />
            <span className="flex-1" />
            <Skeleton className="h-4 w-16 rounded" />
        </div>
    )
}

// pagina de etiquetas

function RouteComponent() {
    const { workspaceId } = Route.useParams()
    const { data: tags, isLoading } = useQuery(tagsQuery(workspaceId))

    const [createOpen, setCreateOpen] = useState(false)
    const [editTag, setEditTag] = useState<WorkspaceTag | null>(null)
    const [deleteTag, setDeleteTag] = useState<WorkspaceTag | null>(null)

    return (
        <div className="flex flex-col min-h-full">
            {/* cabecera con boton de crear */}
            <div className="sticky top-0 z-10 backdrop-blur-sm border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <Tag size={15} className="text-muted-foreground" />
                    <h1 className="text-[14px] font-semibold">Etiquetas</h1>
                    {tags && tags.length > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-black/6 dark:bg-white/8 text-[11px] font-semibold text-muted-foreground tabular-nums">
                            {tags.length}
                        </span>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    className="gap-1.5 shrink-0"
                >
                    <Plus size={14} />
                    <span className="hidden sm:inline">Nueva etiqueta</span>
                </Button>
            </div>

            <div className="flex flex-col flex-1 px-4 py-5">
                {isLoading ? (
                    <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs overflow-hidden">
                        <div className="flex flex-col p-1.5 gap-0.5">
                            {[1, 2, 3, 4].map((i) => <TagRowSkeleton key={i} />)}
                        </div>
                    </div>
                ) : !tags?.length ? (
                    /* sin etiquetas todavia */
                    <div className="flex flex-col items-center justify-center gap-4 flex-1 py-24 text-center">
                        <div className="size-14 rounded-2xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs flex items-center justify-center">
                            <Tag size={22} className="text-muted-foreground/40" strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[13px] font-medium text-muted-foreground">Sin etiquetas</p>
                            <p className="text-[12px] text-muted-foreground/50 max-w-xs">
                                Crea etiquetas para organizar y filtrar tus archivos
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCreateOpen(true)}
                            className="gap-1.5 mt-1"
                        >
                            <Plus size={14} /> Nueva etiqueta
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs overflow-hidden">
                        <div className="flex flex-col p-1.5 gap-0.5">
                            {tags.map((tag) => (
                                <TagRow
                                    key={tag.id}
                                    tag={tag}
                                    workspaceId={workspaceId}
                                    onEdit={setEditTag}
                                    onDelete={setDeleteTag}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* dialogos de crear/editar/borrar */}
            <TagFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                workspaceId={workspaceId}
            />
            {editTag && (
                <TagFormDialog
                    open={!!editTag}
                    onOpenChange={(v) => !v && setEditTag(null)}
                    workspaceId={workspaceId}
                    tag={editTag}
                />
            )}
            {deleteTag && (
                <DeleteTagDialog
                    open={!!deleteTag}
                    onOpenChange={(v) => !v && setDeleteTag(null)}
                    workspaceId={workspaceId}
                    tag={deleteTag}
                />
            )}

        </div>
    )
}
