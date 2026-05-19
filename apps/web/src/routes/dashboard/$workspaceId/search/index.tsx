import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { driveContentQuery } from '#/lib/queries/drive'
import type { DriveFileItem, DriveFolderItem } from '@intellidocs/types'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Input } from '#/components/ui/input'
import {
    FileIcon,
    FileImageIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    Folder,
    Loader2,
    Search,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatFileSize } from '#/lib/file-size'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/dashboard/$workspaceId/search/')({
    component: RouteComponent,
    head: () => ({ title: 'Búsqueda — IntelliDocs' }),
})

function initials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function relativeTime(d: string) {
    return formatDistanceToNow(new Date(d), { addSuffix: true, locale: es })
}

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
    const cls = 'size-[18px] shrink-0'
    if (!mimeType) return <FileIcon className={cn(cls, 'text-gray-400')} />
    if (mimeType === 'application/pdf')
        return <FileTextIcon className={cn(cls, 'text-red-400')} />
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        return <FileTextIcon className={cn(cls, 'text-blue-400')} />
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        return <FileSpreadsheetIcon className={cn(cls, 'text-green-400')} />
    if (mimeType.startsWith('image/'))
        return <FileImageIcon className={cn(cls, 'text-purple-400')} />
    return <FileIcon className={cn(cls, 'text-gray-400')} />
}

function FolderRow({ item, workspaceId }: { item: DriveFolderItem; workspaceId: string }) {
    return (
        <Link
            to="/dashboard/$workspaceId/drive"
            params={{ workspaceId }}
            search={{ folderId: item.id }}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/4 dark:hover:bg-white/4 transition-colors"
        >
            <div className="size-8 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
                <Folder
                    size={15}
                    className="text-amber-500"
                    style={item.color ? { color: item.color } : undefined}
                />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-medium truncate group-hover:text-foreground transition-colors">
                    {item.name}
                </span>
                <span className="text-[11px] text-muted-foreground/50">
                    {relativeTime(item.updatedAt)}
                </span>
            </div>
            {item.createdBy && (
                <Avatar className="shrink-0 size-6">
                    {item.createdBy.image && <AvatarImage src={item.createdBy.image} />}
                    <AvatarFallback className="text-[9px]">{initials(item.createdBy.name)}</AvatarFallback>
                </Avatar>
            )}
        </Link>
    )
}

function FileRow({ item, workspaceId }: { item: DriveFileItem; workspaceId: string }) {
    return (
        <Link
            to="/dashboard/$workspaceId/drive"
            params={{ workspaceId }}
            search={item.parentId ? { folderId: item.parentId } : {}}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/4 dark:hover:bg-white/4 transition-colors"
        >
            <div className="size-8 rounded-lg bg-black/4 dark:bg-white/5 flex items-center justify-center shrink-0">
                <FileTypeIcon mimeType={item.mimeType} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[13px] font-medium truncate group-hover:text-foreground transition-colors">
                        {item.name}
                    </span>
                    {item.tags.slice(0, 1).map((tag) => (
                        <span
                            key={tag.id}
                            className="hidden sm:inline-flex shrink-0 items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{
                                background: tag.color ? `${tag.color}18` : 'rgba(148,163,184,0.12)',
                                color: tag.color ?? undefined,
                                border: `1px solid ${tag.color ?? '#94a3b8'}35`,
                            }}
                        >
                            {tag.name}
                        </span>
                    ))}
                </div>
                <span className="text-[11px] text-muted-foreground/50">
                    {item.size ? formatFileSize(Number(item.size)) : 'Archivo'} · {relativeTime(item.updatedAt)}
                </span>
            </div>
            <Avatar className="shrink-0 size-6">
                {item.uploadedBy.image && <AvatarImage src={item.uploadedBy.image} />}
                <AvatarFallback className="text-[9px]">{initials(item.uploadedBy.name)}</AvatarFallback>
            </Avatar>
        </Link>
    )
}

function SectionHeader({ title, count }: { title: string; count: number }) {
    return (
        <div className="flex items-center gap-2 px-1 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                {title}
            </span>
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-black/6 dark:bg-white/8 text-[10px] font-semibold text-muted-foreground">
                {count}
            </span>
        </div>
    )
}

function RouteComponent() {
    const { workspaceId } = Route.useParams()

    const [query, setQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 400)
        return () => clearTimeout(timer)
    }, [query])

    const { data, isLoading, isFetching } = useQuery({
        ...driveContentQuery(workspaceId, null, debouncedQuery || undefined),
        enabled: debouncedQuery.trim().length > 0,
    })

    const folders = (data?.items.filter((i) => i.type === 'folder') ?? []) as DriveFolderItem[]
    const files = (data?.items.filter((i) => i.type === 'file') ?? []) as DriveFileItem[]
    const totalCount = folders.length + files.length
    const isStale = query !== debouncedQuery || isFetching
    const hasQuery = debouncedQuery.trim().length > 0

    return (
        <div className="flex flex-col min-h-full">
            {/* barra de busqueda sticky arriba */}
            <div className="sticky top-0 z-10 backdrop-blur-sm border-b border-black/5 dark:border-white/5 px-4 py-3">
                <div className="flex items-center gap-3 rounded-xl border border-black/8 dark:border-white/8 bg-black/2 dark:bg-white/3 px-3 py-2 focus-within:border-black/15 dark:focus-within:border-white/15 focus-within:bg-black/4 dark:focus-within:bg-white/5 transition-all">
                    <Search size={15} className="shrink-0 text-muted-foreground/60" />
                    <Input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar archivos y carpetas…"
                        className="h-auto text-[13px] border-none shadow-none focus-visible:ring-0 bg-transparent px-0 py-0 flex-1"
                    />
                    {isStale && hasQuery && (
                        <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground/40" />
                    )}
                </div>
            </div>

            <div className="flex flex-col flex-1 px-4 py-5">
                {!hasQuery ? (
                    /* sin query todavia */
                    <div className="flex flex-col items-center justify-center gap-4 flex-1 py-24 text-center">
                        <div className="size-14 rounded-2xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs flex items-center justify-center">
                            <Search size={22} className="text-muted-foreground/40" strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[13px] font-medium text-muted-foreground">Busca en tu workspace</p>
                            <p className="text-[12px] text-muted-foreground/50 max-w-xs">
                                Encuentra archivos y carpetas por nombre
                            </p>
                        </div>
                    </div>
                ) : isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                ) : totalCount === 0 ? (
                    /* no encontro nada */
                    <div className="flex flex-col items-center justify-center gap-4 flex-1 py-24 text-center">
                        <div className="size-14 rounded-2xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs flex items-center justify-center">
                            <Search size={22} className="text-muted-foreground/40" strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[13px] font-medium text-muted-foreground">Sin resultados</p>
                            <p className="text-[12px] text-muted-foreground/50">
                                Nada coincide con <span className="font-medium text-muted-foreground">"{debouncedQuery}"</span>
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* cuantos resultados hay */}
                        <p className="text-[12px] text-muted-foreground/50 px-1">
                            {totalCount} {totalCount === 1 ? 'resultado' : 'resultados'}
                            {data?.hasMore && ' · mostrando los primeros 50'}
                        </p>

                        {/* carpetas encontradas */}
                        {folders.length > 0 && (
                            <section className="flex flex-col">
                                <SectionHeader title="Carpetas" count={folders.length} />
                                <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs overflow-hidden">
                                    <div className="flex flex-col p-1.5 gap-0.5">
                                        {folders.map((f) => (
                                            <FolderRow key={f.id} item={f} workspaceId={workspaceId} />
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* archivos encontrados */}
                        {files.length > 0 && (
                            <section className="flex flex-col">
                                <SectionHeader title="Archivos" count={files.length} />
                                <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs overflow-hidden">
                                    <div className="flex flex-col p-1.5 gap-0.5">
                                        {files.map((f) => (
                                            <FileRow key={f.id} item={f} workspaceId={workspaceId} />
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
