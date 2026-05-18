import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
    fetchProcessingStatus,
    type ProcessingItem,
} from '#/lib/queries/processing'
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Cpu,
    FileIcon,
    FileImageIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    Hash,
    Info,
    Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatFileSize } from '#/lib/file-size'
import { cn } from '#/lib/utils'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/dashboard/$workspaceId/processing/')({
    component: RouteComponent,
})

// helpers de tiempo y formato

function relativeTime(d: string) {
    return formatDistanceToNow(new Date(d), { addSuffix: true, locale: es })
}

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
    const cls = 'size-[15px] shrink-0'
    if (!mimeType) return <FileIcon className={cn(cls, 'text-gray-400')} />
    if (mimeType === 'application/pdf')
        return <FileTextIcon className={cn(cls, 'text-red-400/80')} />
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        return <FileTextIcon className={cn(cls, 'text-blue-400/80')} />
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        return <FileSpreadsheetIcon className={cn(cls, 'text-green-400/80')} />
    if (mimeType?.startsWith('image/'))
        return <FileImageIcon className={cn(cls, 'text-purple-400/80')} />
    return <FileIcon className={cn(cls, 'text-gray-400')} />
}

// badge de estado del archivo

function StatusBadge({ status }: { status: ProcessingItem['status'] }) {
    if (status === 'ready')
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 shrink-0">
                <CheckCircle2 size={11} />
                Listo
            </span>
        )
    if (status === 'processing' || status === 'uploading')
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                <Loader2 size={11} className="animate-spin" />
                Procesando
            </span>
        )
    if (status === 'error')
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
                <AlertCircle size={11} />
                Error
            </span>
        )
    return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/6 dark:bg-white/8 text-muted-foreground border border-black/8 dark:border-white/10 shrink-0">
            <Clock size={11} />
            Pendiente
        </span>
    )
}

// chipito con metadato del archivo

function MetaChip({ label, value }: { label: string; value: string | number }) {
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/8 text-muted-foreground">
            <span className="opacity-60">{label}</span>
            <span className="font-semibold text-foreground/80">{value}</span>
        </span>
    )
}

// fila de archivo con su estado de procesamiento

function FileRow({ item }: { item: ProcessingItem }) {
    const c = item.content
    const imgMeta =
        item.mimeType?.startsWith('image/') && c?.metadata
            ? (c.metadata as { width?: number; height?: number; format?: string })
            : null
    const checksum = item.activeVersion?.checksum
    const hasReadyMeta = item.status === 'ready' && (c?.pageCount != null || c?.wordCount != null || imgMeta || checksum)

    return (
        <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-black/4 dark:hover:bg-white/4 transition-colors group">
            {/* caja del icono */}
            <div className="size-8 rounded-lg bg-black/4 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                <FileTypeIcon mimeType={item.mimeType} />
            </div>

            {/* nombre y metadatos */}
            <div className="flex flex-col min-w-0 flex-1 gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium truncate flex-1 min-w-0">
                        {item.name}
                    </span>
                    <StatusBadge status={item.status} />
                </div>

                {/* chips con paginas, palabras, etc. */}
                {hasReadyMeta && (
                    <div className="flex flex-wrap gap-1">
                        {c?.pageCount != null && (
                            <MetaChip label="páginas" value={c.pageCount} />
                        )}
                        {c?.wordCount != null && (
                            <MetaChip label="palabras" value={c.wordCount.toLocaleString('es')} />
                        )}
                        {imgMeta?.width && imgMeta?.height && (
                            <MetaChip label="dimensiones" value={`${imgMeta.width}×${imgMeta.height}`} />
                        )}
                        {imgMeta?.format && (
                            <MetaChip label="formato" value={imgMeta.format.toUpperCase()} />
                        )}
                        {checksum && (
                            <span
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/8 text-muted-foreground font-mono"
                                title={`SHA-256: ${checksum}`}
                            >
                                <Hash size={9} className="opacity-60" />
                                {checksum.slice(0, 12)}…
                            </span>
                        )}
                        {c?.extractedAt && (
                            <span className="text-[10px] text-muted-foreground/50 self-center">
                                indexado {relativeTime(c.extractedAt)}
                            </span>
                        )}
                    </div>
                )}

                {/* mensaje de error si fallo */}
                {item.status === 'error' && c?.extractError && (
                    <p className="text-[11px] text-red-500/80 break-words leading-relaxed">
                        {c.extractError}
                    </p>
                )}

                {/* archivo listo pero sin metadatos extraibles */}
                {item.status === 'ready' && !hasReadyMeta && (
                    <span className="text-[11px] text-muted-foreground/40">
                        Sin metadatos extraíbles
                    </span>
                )}
            </div>

            {/* cuando fue */}
            <span className="hidden sm:block shrink-0 text-[11px] text-muted-foreground/40 mt-1">
                {relativeTime(item.createdAt)}
            </span>
        </div>
    )
}

// label de seccion con contador

function SectionLabel({ label, count }: { label: string; count: number }) {
    return (
        <div className="flex items-center gap-2 px-1 pt-2 pb-1 select-none">
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

function FileRowSkeleton() {
    return (
        <div className="flex items-start gap-3 px-3 py-2.5">
            <Skeleton className="size-8 rounded-lg shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1.5 flex-1 min-w-0 mt-0.5">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-44 rounded flex-1" />
                    <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                </div>
                <div className="flex gap-1">
                    <Skeleton className="h-4 w-16 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-md" />
                </div>
            </div>
            <Skeleton className="hidden sm:block h-3 w-20 rounded mt-1 shrink-0" />
        </div>
    )
}

// pagina de procesamiento

const STATUS_ORDER = ['processing', 'uploading', 'error', 'pending', 'ready'] as const

function groupByStatus(items: ProcessingItem[]) {
    const map = new Map<string, ProcessingItem[]>()
    for (const item of items) {
        const key = item.status === 'uploading' ? 'processing' : item.status
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(item)
    }
    const LABELS: Record<string, string> = {
        processing: 'En curso',
        error: 'Con errores',
        pending: 'Pendiente',
        ready: 'Completados',
    }
    return STATUS_ORDER
        .filter((s) => s !== 'uploading' && map.has(s))
        .map((s) => ({ key: s, label: LABELS[s] ?? s, items: map.get(s)! }))
}

function RouteComponent() {
    const { workspaceId } = Route.useParams()

    const { data, isLoading } = useQuery({
        queryKey: ['processing', workspaceId],
        queryFn: () => fetchProcessingStatus(workspaceId),
        refetchInterval: (query) => {
            const items = query.state.data?.items ?? []
            const hasActive = items.some((i) => i.status === 'processing' || i.status === 'uploading')
            return hasActive ? 4000 : false
        },
    })

    const activeCount = data?.items.filter(
        (i) => i.status === 'processing' || i.status === 'uploading',
    ).length ?? 0
    const totalCount = data?.items.length ?? 0
    const groups = groupByStatus(data?.items ?? [])

    return (
        <div className="flex flex-col min-h-full">
            {/* cabecera con estado activo */}
            <div className="sticky top-0 z-10 backdrop-blur-sm border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center gap-2.5">
                <Cpu size={15} className="text-muted-foreground" />
                <h1 className="text-[14px] font-semibold">Procesamiento</h1>
                {activeCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Loader2 size={11} className="animate-spin" />
                        {activeCount} en curso
                    </span>
                ) : totalCount > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-black/6 dark:bg-white/8 text-[11px] font-semibold text-muted-foreground tabular-nums">
                        {totalCount}
                    </span>
                ) : null}
            </div>

            <div className="flex flex-col flex-1 px-4 py-5 gap-4">
                {/* texto explicativo de que hace el procesamiento */}
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-black/3 dark:bg-white/3 border border-black/6 dark:border-white/6">
                    <Info size={13} className="text-muted-foreground/60 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                        Al subir un archivo, el servidor extrae su texto (PDFs), dimensiones (imágenes)
                        y calcula la huella SHA-256 para detectar duplicados. Los resultados se indexan
                        para el buscador.
                    </p>
                </div>

                {/* lista de archivos agrupados por estado */}
                <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs overflow-hidden">
                    {isLoading ? (
                        <div className="flex flex-col p-1.5 gap-0.5">
                            {[1, 2, 3, 4].map((i) => <FileRowSkeleton key={i} />)}
                        </div>
                    ) : !data?.items.length ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                            <div className="size-14 rounded-2xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs flex items-center justify-center">
                                <Cpu size={22} className="text-muted-foreground/40" strokeWidth={1.5} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-[13px] font-medium text-muted-foreground">Sin archivos procesados</p>
                                <p className="text-[12px] text-muted-foreground/50">
                                    Sube un archivo al drive para verlo aquí
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col p-1.5 gap-3">
                            {groups.map((group) => (
                                <section key={group.key}>
                                    <SectionLabel label={group.label} count={group.items.length} />
                                    <div className="flex flex-col gap-0.5">
                                        {group.items.map((item) => (
                                            <FileRow key={item.id} item={item} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
