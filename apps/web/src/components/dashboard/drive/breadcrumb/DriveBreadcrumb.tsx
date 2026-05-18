import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ChevronRight, FolderIcon, HardDrive, Loader2 } from 'lucide-react'
import { Skeleton } from '#/components/ui/skeleton'
import { api } from '#/lib/api'
import type { DriveBreadcrumbItem, GetDriveBreadcrumbsResponse } from '@intellidocs/types'
import { cn } from '#/lib/utils'

type Segment = DriveBreadcrumbItem | 'ellipsis'

function buildSegments(items: DriveBreadcrumbItem[]): Segment[] {
    if (items.length <= 3) return items
    // root + … + ultimos dos
    return [items[0], 'ellipsis', ...items.slice(-2)]
}

export const DriveBreadcrumb = ({
    workspaceId,
    currentFolderId,
}: {
    workspaceId: string
    currentFolderId: string | undefined
}) => {
    const [breadcrumbs, setBreadcrumbs] = useState<DriveBreadcrumbItem[]>([])
    const [loading, setLoading] = useState(false)
    const [initialLoad, setInitialLoad] = useState(true)

    useEffect(() => {
        let cancelled = false

        const fetch = async () => {
            setLoading(true)
            try {
                const res = await api.get<GetDriveBreadcrumbsResponse>(
                    `/workspaces/${workspaceId}/drive/breadcrumbs?folderId=${currentFolderId ?? ''}`,
                )
                if (!cancelled) setBreadcrumbs(res.items)
            } catch {
                // no pasa nada si falla, no se rompe nada
            } finally {
                if (!cancelled) {
                    setLoading(false)
                    setInitialLoad(false)
                }
            }
        }

        fetch()
        return () => { cancelled = true }
    }, [workspaceId, currentFolderId])

    // skeleton solo la primera vez, cuando no hay nada en pantalla todavia
    if (initialLoad && loading) {
        return (
            <div className="flex items-center gap-1.5">
                <Skeleton className="h-4 w-16 rounded" />
                <ChevronRight size={12} className="text-muted-foreground/30" />
                <Skeleton className="h-4 w-20 rounded" />
            </div>
        )
    }

    const segments = buildSegments(breadcrumbs)

    return (
        <nav aria-label="breadcrumb" className="flex items-center gap-0.5 min-w-0 flex-wrap">
            {segments.map((seg, index) => {
                const isLast = index === segments.length - 1

                // separador entre items, no va antes del primero
                const sep = index > 0 ? (
                    <ChevronRight
                        key={`sep-${index}`}
                        size={13}
                        className="text-muted-foreground/30 shrink-0 mx-0.5"
                    />
                ) : null

                // los puntos suspensivos cuando hay muchos niveles
                if (seg === 'ellipsis') {
                    return (
                        <span key="ellipsis" className="flex items-center gap-0.5">
                            {sep}
                            <span className="text-[13px] text-muted-foreground/40 px-1 select-none">…</span>
                        </span>
                    )
                }

                const isRoot = !seg.id
                const href = isRoot
                    ? `/dashboard/${workspaceId}/drive`
                    : `/dashboard/${workspaceId}/drive?folderId=${seg.id}`

                // ultimo item, es la pagina actual, no es link
                if (isLast) {
                    return (
                        <span key={seg.id ?? 'root'} className="flex items-center gap-0.5">
                            {sep}
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground',
                                    'max-w-[160px] truncate',
                                )}
                                aria-current="page"
                            >
                                {isRoot
                                    ? <HardDrive size={14} className="shrink-0 text-muted-foreground" />
                                    : <FolderIcon size={14} className="shrink-0 text-amber-500" fill="#f59e0b" />
                                }
                                <span className="truncate">{seg.name}</span>
                            </span>
                        </span>
                    )
                }

                // items del medio, son links para navegar
                return (
                    <span key={seg.id ?? 'root'} className="flex items-center gap-0.5">
                        {sep}
                        <Link
                            to={href}
                            className={cn(
                                'inline-flex items-center gap-1.5 text-[13px] text-muted-foreground/70',
                                'hover:text-foreground transition-colors rounded px-1 py-0.5 -mx-1 -my-0.5',
                                'hover:bg-black/5 dark:hover:bg-white/5',
                                'max-w-[120px] truncate',
                            )}
                        >
                            {isRoot
                                ? <HardDrive size={14} className="shrink-0" />
                                : <FolderIcon size={14} className="shrink-0" fill="currentColor" />
                            }
                            <span className="truncate">{seg.name}</span>
                        </Link>
                    </span>
                )
            })}

            {/* spinnerito mientras navega, pero no en la carga inicial */}
            {loading && !initialLoad && (
                <Loader2 size={12} className="animate-spin text-muted-foreground/40 ml-1.5 shrink-0" />
            )}
        </nav>
    )
}
