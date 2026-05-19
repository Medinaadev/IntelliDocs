import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRealtimeChannel } from '#/lib/realtime/useRealtimeChannel'
import {
    trashQuery,
    type TrashedFile,
    type TrashedFolder,
    type TrashedItem,
} from '#/lib/queries/trash'
import { api } from '#/lib/api'
import { formatFileSize } from '#/lib/file-size'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import {
    FileIcon,
    FileImageIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    FolderIcon,
    Loader2,
    RotateCcw,
    Trash2,
    Trash,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '#/lib/utils'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/dashboard/$workspaceId/trash/')({
    component: RouteComponent,
    head: () => ({ title: 'Papelera — IntelliDocs' }),
})

// helpers de fechas

const relativeTime = (d: string) =>
    formatDistanceToNow(new Date(d), { addSuffix: true, locale: es })

const absoluteTime = (d: string) =>
    format(new Date(d), 'd MMM yyyy, HH:mm', { locale: es })

function authorInitials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

// icono segun el tipo de archivo

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
    const cls = 'size-[16px] shrink-0'
    if (!mimeType) return <FileIcon className={cn(cls, 'text-gray-400')} />
    if (mimeType === 'application/pdf')
        return <FileTextIcon className={cn(cls, 'text-red-400/80')} />
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        return <FileTextIcon className={cn(cls, 'text-blue-400/80')} />
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        return <FileSpreadsheetIcon className={cn(cls, 'text-green-400/80')} />
    if (mimeType.startsWith('image/'))
        return <FileImageIcon className={cn(cls, 'text-purple-400/80')} />
    return <FileIcon className={cn(cls, 'text-gray-400')} />
}

// grid de la tabla, responsive

const ROW =
    'grid items-center gap-x-3 px-3' +
    ' grid-cols-[minmax(0,1fr)_72px_56px]' +
    ' sm:grid-cols-[minmax(0,1fr)_72px_140px_56px]' +
    ' md:grid-cols-[minmax(0,1fr)_72px_140px_140px_56px]'

function TableHeader() {
    return (
        <div className={cn(ROW, 'py-2.5 border-b border-black/6 dark:border-white/6 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/50 select-none')}>
            <span>Nombre</span>
            <span className="text-right">Tamaño</span>
            <span className="hidden sm:block text-right">Eliminado</span>
            <span className="hidden md:block">Eliminado por</span>
            <span />
        </div>
    )
}

function SectionLabel({ label, count }: { label: string; count: number }) {
    return (
        <div className="flex items-center gap-2 px-1 pt-2 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                {label}
            </span>
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-black/6 dark:bg-white/8 text-[10px] font-semibold text-muted-foreground tabular-nums">
                {count}
            </span>
        </div>
    )
}

// skeleton mientras carga

function TrashRowSkeleton() {
    return (
        <div className={cn(ROW, 'py-1.5')}>
            <div className="flex items-center gap-2.5 min-w-0">
                <Skeleton className="size-8 rounded-lg shrink-0" />
                <Skeleton className="h-3.5 w-36 rounded" />
            </div>
            <Skeleton className="h-3 w-12 rounded ml-auto" />
            <Skeleton className="hidden sm:block h-3 w-20 rounded ml-auto" />
            <div className="hidden md:flex items-center gap-2">
                <Skeleton className="size-6 rounded-full shrink-0" />
                <Skeleton className="h-3 w-20 rounded" />
            </div>
            <span />
        </div>
    )
}

// dialogos de confirmacion antes de borrar

function ConfirmDeleteDialog({
    open, onOpenChange, item, onConfirm, loading,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    item: TrashedItem | null
    onConfirm: () => void
    loading: boolean
}) {
    if (!item) return null
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader className="border-b border-black/8 dark:border-white/8 pb-3">
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 size={15} />
                        Eliminar permanentemente
                    </DialogTitle>
                    <DialogDescription className="pt-1">
                        <span className="font-medium text-foreground">"{item.name}"</span>{' '}
                        será eliminado para siempre. Esta acción no se puede deshacer.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={onConfirm} disabled={loading}>
                        {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        Eliminar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function EmptyTrashDialog({
    open, onOpenChange, count, onConfirm, loading,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    count: number
    onConfirm: () => void
    loading: boolean
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader className="border-b border-black/8 dark:border-white/8 pb-3">
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash size={15} />
                        Vaciar papelera
                    </DialogTitle>
                    <DialogDescription className="pt-1">
                        Se eliminarán permanentemente{' '}
                        <span className="font-medium text-foreground">
                            {count} {count === 1 ? 'elemento' : 'elementos'}
                        </span>
                        . Esta acción no se puede deshacer.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={onConfirm} disabled={loading}>
                        {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash size={13} />}
                        Vaciar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// fila de elemento en papelera

function TrashRow({
    item, onRestore, onDelete, restoringId,
}: {
    item: TrashedItem
    onRestore: (item: TrashedItem) => void
    onDelete: (item: TrashedItem) => void
    restoringId: string | null
}) {
    const isRestoring = restoringId === item.id
    const isFolder = item.type === 'folder'
    const size = item.type === 'file' ? (item as TrashedFile).size : null
    const color = isFolder ? (item as TrashedFolder).color : null
    const by = item.trashedBy

    return (
        <div className={cn(ROW, 'py-1.5 rounded-lg group hover:bg-black/4 dark:hover:bg-white/4 transition-colors')}>
            {/* icono y nombre del elemento */}
            <div className="flex items-center gap-2.5 min-w-0">
                {isFolder ? (
                    <div
                        className="size-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: color ? `${color}18` : 'rgba(251,191,36,0.10)' }}
                    >
                        <FolderIcon
                            size={16}
                            style={{ color: color ?? '#f59e0b' }}
                            fill={color ?? '#f59e0b'}
                        />
                    </div>
                ) : (
                    <div className="size-8 rounded-lg bg-black/4 dark:bg-white/5 flex items-center justify-center shrink-0">
                        <FileTypeIcon mimeType={(item as TrashedFile).mimeType} />
                    </div>
                )}
                <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-medium truncate">{item.name}</span>
                    <span className="text-[11px] text-muted-foreground/50 sm:hidden">
                        {relativeTime(item.trashedAt)}
                    </span>
                </div>
            </div>

            {/* peso del archivo */}
            <span className="text-xs text-muted-foreground text-right tabular-nums">
                {size ? formatFileSize(Number(size)) : '—'}
            </span>

            {/* cuando se elimino */}
            <span
                className="hidden sm:block text-xs text-muted-foreground text-right truncate"
                title={absoluteTime(item.trashedAt)}
            >
                {relativeTime(item.trashedAt)}
            </span>

            {/* quien lo elimino */}
            <div className="hidden md:flex items-center gap-2 min-w-0">
                {by ? (
                    <>
                        <Avatar size="sm" className="shrink-0" title={by.name}>
                            {by.image && <AvatarImage src={by.image} />}
                            <AvatarFallback>{authorInitials(by.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate">{by.name}</span>
                    </>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                )}
            </div>

            {/* restaurar o borrar para siempre */}
            <div className="flex items-center gap-0.5 justify-end">
                <button
                    title="Restaurar"
                    onClick={() => onRestore(item)}
                    disabled={isRestoring}
                    className="size-7 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-foreground hover:bg-black/8 dark:hover:bg-white/8 transition-colors disabled:opacity-50 group-hover:text-muted-foreground"
                >
                    {isRestoring
                        ? <Loader2 size={13} className="animate-spin" />
                        : <RotateCcw size={13} />
                    }
                </button>
                <button
                    title="Eliminar permanentemente"
                    onClick={() => onDelete(item)}
                    className="size-7 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-destructive hover:bg-destructive/8 transition-colors group-hover:text-muted-foreground"
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    )
}

// pagina de la papelera

function RouteComponent() {
    const { workspaceId } = Route.useParams()
    const qc = useQueryClient()

    useRealtimeChannel({
        channel: 'Drive',
        filters: { workspaceId },
        onEvent: () => {
            qc.invalidateQueries({ queryKey: ['trash', workspaceId] })
        },
    })

    const { data, isLoading } = useQuery(trashQuery(workspaceId))

    const [restoringId, setRestoringId] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<TrashedItem | null>(null)
    const [emptyOpen, setEmptyOpen] = useState(false)

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['trash', workspaceId] })
        qc.invalidateQueries({ queryKey: ['drive', workspaceId] })
        qc.invalidateQueries({ queryKey: ['overview', workspaceId] })
    }

    const handleRestore = async (item: TrashedItem) => {
        setRestoringId(item.id)
        try {
            const endpoint = item.type === 'folder'
                ? `/workspaces/${workspaceId}/drive/trash/folders/${item.id}/restore`
                : `/workspaces/${workspaceId}/drive/trash/files/${item.id}/restore`
            await api.patch(endpoint, {})
            toast.success(`"${item.name}" restaurado`)
            invalidate()
        } catch {
            toast.error('No se pudo restaurar el elemento')
        } finally {
            setRestoringId(null)
        }
    }

    const deleteMutation = useMutation({
        mutationFn: (item: TrashedItem) => {
            const endpoint = item.type === 'folder'
                ? `/workspaces/${workspaceId}/drive/trash/folders/${item.id}`
                : `/workspaces/${workspaceId}/drive/trash/files/${item.id}`
            return api.delete(endpoint)
        },
        onSuccess: () => {
            toast.success('Elemento eliminado permanentemente')
            setDeleteTarget(null)
            invalidate()
        },
        onError: () => toast.error('No se pudo eliminar el elemento'),
    })

    const emptyMutation = useMutation({
        mutationFn: () => api.delete(`/workspaces/${workspaceId}/drive/trash`),
        onSuccess: () => {
            toast.success('Papelera vaciada')
            setEmptyOpen(false)
            invalidate()
        },
        onError: () => toast.error('No se pudo vaciar la papelera'),
    })

    const totalCount = data?.totalCount ?? 0
    const hasFolders = (data?.folders.length ?? 0) > 0
    const hasFiles = (data?.files.length ?? 0) > 0

    return (
        <div className="flex flex-col min-h-full">
            {/* cabecera */}
            <div className="sticky top-0 z-10 backdrop-blur-sm border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <Trash size={15} className="text-muted-foreground" />
                    <h1 className="text-[14px] font-semibold">Papelera</h1>
                    {totalCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-black/6 dark:bg-white/8 text-[11px] font-semibold text-muted-foreground tabular-nums">
                            {totalCount}
                        </span>
                    )}
                </div>

                {totalCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEmptyOpen(true)}
                        className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/8 hover:border-destructive/30 hover:text-destructive shrink-0"
                    >
                        <Trash size={13} />
                        <span className="hidden sm:inline">Vaciar papelera</span>
                    </Button>
                )}
            </div>

            {/* contenido */}
            <div className="flex flex-col flex-1 px-4 py-5">
                {isLoading ? (
                    <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs overflow-hidden">
                        <TableHeader />
                        <div className="flex flex-col p-1.5 gap-0.5">
                            {[1, 2, 3, 4].map((i) => <TrashRowSkeleton key={i} />)}
                        </div>
                    </div>
                ) : totalCount === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 flex-1 py-24 text-center">
                        <div className="size-14 rounded-2xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs flex items-center justify-center">
                            <Trash size={22} className="text-muted-foreground/40" strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[13px] font-medium text-muted-foreground">La papelera está vacía</p>
                            <p className="text-[12px] text-muted-foreground/50">
                                Los archivos y carpetas eliminados aparecerán aquí
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs overflow-hidden">
                        <TableHeader />
                        <div className="flex flex-col p-1.5 gap-3">
                            {hasFolders && (
                                <section>
                                    <SectionLabel label="Carpetas" count={data!.folders.length} />
                                    <div className="flex flex-col gap-0.5">
                                        {data!.folders.map((item) => (
                                            <TrashRow
                                                key={item.id}
                                                item={item}
                                                onRestore={handleRestore}
                                                onDelete={setDeleteTarget}
                                                restoringId={restoringId}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                            {hasFiles && (
                                <section>
                                    <SectionLabel label="Archivos" count={data!.files.length} />
                                    <div className="flex flex-col gap-0.5">
                                        {data!.files.map((item) => (
                                            <TrashRow
                                                key={item.id}
                                                item={item}
                                                onRestore={handleRestore}
                                                onDelete={setDeleteTarget}
                                                restoringId={restoringId}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* dialogos de confirmacion */}
            <ConfirmDeleteDialog
                open={!!deleteTarget}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                item={deleteTarget}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
                loading={deleteMutation.isPending}
            />
            <EmptyTrashDialog
                open={emptyOpen}
                onOpenChange={setEmptyOpen}
                count={totalCount}
                onConfirm={() => emptyMutation.mutate()}
                loading={emptyMutation.isPending}
            />
        </div>
    )
}
