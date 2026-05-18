import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { activityQuery } from '#/lib/queries/activity'
import type { AuditLogEntry } from '#/lib/queries/activity'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Skeleton } from '#/components/ui/skeleton'
import {
    Activity,
    Download,
    FileText,
    FileUp,
    FolderPlus,
    FolderX,
    FileX,
    PencilLine,
    RotateCcw,
    Tag,
    Trash2,
} from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/dashboard/$workspaceId/activity/')({
    component: RouteComponent,
})

// metadatos de cada tipo de accion (label, icono, color)

type ActionMeta = {
    label: string
    icon: React.ReactNode
    iconColor: string
    iconBg: string
}

const ACTION_META: Record<string, ActionMeta> = {
    file_uploaded: {
        label: 'subió',
        icon: <FileUp size={14} />,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-500/10',
    },
    file_deleted: {
        label: 'eliminó',
        icon: <FileX size={14} />,
        iconColor: 'text-red-500',
        iconBg: 'bg-red-500/10',
    },
    file_restored: {
        label: 'restauró',
        icon: <RotateCcw size={14} />,
        iconColor: 'text-green-500',
        iconBg: 'bg-green-500/10',
    },
    file_renamed: {
        label: 'renombró',
        icon: <PencilLine size={14} />,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
    },
    file_downloaded: {
        label: 'descargó',
        icon: <Download size={14} />,
        iconColor: 'text-purple-500',
        iconBg: 'bg-purple-500/10',
    },
    file_tagged: {
        label: 'etiquetó',
        icon: <Tag size={14} />,
        iconColor: 'text-violet-500',
        iconBg: 'bg-violet-500/10',
    },
    folder_created: {
        label: 'creó la carpeta',
        icon: <FolderPlus size={14} />,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
    },
    folder_deleted: {
        label: 'eliminó la carpeta',
        icon: <FolderX size={14} />,
        iconColor: 'text-red-500',
        iconBg: 'bg-red-500/10',
    },
    folder_restored: {
        label: 'restauró la carpeta',
        icon: <RotateCcw size={14} />,
        iconColor: 'text-green-500',
        iconBg: 'bg-green-500/10',
    },
    folder_renamed: {
        label: 'renombró la carpeta',
        icon: <PencilLine size={14} />,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
    },
    file_permanently_deleted: {
        label: 'eliminó permanentemente',
        icon: <Trash2 size={14} />,
        iconColor: 'text-red-600',
        iconBg: 'bg-red-600/10',
    },
    version_uploaded: {
        label: 'subió nueva versión de',
        icon: <FileText size={14} />,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-500/10',
    },
}

function getActionMeta(action: string): ActionMeta {
    return ACTION_META[action] ?? {
        label: action.replace(/_/g, ' '),
        icon: <Activity size={14} />,
        iconColor: 'text-muted-foreground',
        iconBg: 'bg-black/6 dark:bg-white/8',
    }
}

// agrupa eventos por dia

function dateGroupLabel(dateStr: string): string {
    const d = new Date(dateStr)
    if (isToday(d)) return 'Hoy'
    if (isYesterday(d)) return 'Ayer'
    return format(d, "d 'de' MMMM", { locale: es })
}

function groupByDate(items: AuditLogEntry[]) {
    const map = new Map<string, AuditLogEntry[]>()
    for (const item of items) {
        const key = format(new Date(item.createdAt), 'yyyy-MM-dd')
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(item)
    }
    return Array.from(map.entries()).map(([key, entries]) => ({
        key,
        label: dateGroupLabel(key),
        entries,
    }))
}

// helpers

function initials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

// fila de cada evento de actividad

function EventRow({ entry }: { entry: AuditLogEntry }) {
    const meta = getActionMeta(entry.action)
    const date = new Date(entry.createdAt)

    return (
        <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-black/4 dark:hover:bg-white/4 transition-colors group">
            {/* icono de la accion */}
            <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', meta.iconBg)}>
                <span className={meta.iconColor}>{meta.icon}</span>
            </div>

            {/* texto del evento */}
            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                <p className="text-[13px] leading-snug">
                    <span className="font-medium">{entry.user.name}</span>
                    {' '}
                    <span className="text-muted-foreground">{meta.label}</span>
                    {entry.entityName && (
                        <>
                            {' '}
                            <span className="font-medium break-all">
                                &ldquo;{entry.entityName}&rdquo;
                            </span>
                        </>
                    )}
                </p>
                <time
                    className="text-[11px] text-muted-foreground/50"
                    title={format(date, "d MMM yyyy, HH:mm", { locale: es })}
                >
                    {formatDistanceToNow(date, { addSuffix: true, locale: es })}
                </time>
            </div>

            {/* avatar del usuario */}
            <Avatar className="shrink-0 size-6 mt-0.5">
                {entry.user.image && <AvatarImage src={entry.user.image} />}
                <AvatarFallback className="text-[9px]">{initials(entry.user.name)}</AvatarFallback>
            </Avatar>
        </div>
    )
}

// cabecera de grupo de fecha

function DateHeader({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 px-1 pt-2 pb-1 select-none">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                {label}
            </span>
            <div className="flex-1 h-px bg-black/6 dark:bg-white/6" />
        </div>
    )
}

// skeleton de carga

function EventRowSkeleton() {
    return (
        <div className="flex items-start gap-3 px-3 py-2.5">
            <Skeleton className="size-8 rounded-lg shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1.5 flex-1 min-w-0 mt-1">
                <Skeleton className="h-3.5 w-56 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
            </div>
            <Skeleton className="size-6 rounded-full shrink-0 mt-0.5" />
        </div>
    )
}

// pagina de actividad

function RouteComponent() {
    const { workspaceId } = Route.useParams()
    const { data, isLoading } = useQuery(activityQuery(workspaceId))

    const totalCount = data?.items.length ?? 0
    const groups = groupByDate(data?.items ?? [])

    return (
        <div className="flex flex-col min-h-full">
            {/* cabecera */}
            <div className="sticky top-0 z-10 backdrop-blur-sm border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center gap-2.5">
                <Activity size={15} className="text-muted-foreground" />
                <h1 className="text-[14px] font-semibold">Actividad</h1>
                {totalCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-black/6 dark:bg-white/8 text-[11px] font-semibold text-muted-foreground tabular-nums">
                        {totalCount}
                    </span>
                )}
            </div>

            <div className="flex flex-col flex-1 px-4 py-5">
                <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs overflow-hidden">
                    {isLoading ? (
                        <div className="flex flex-col p-1.5 gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => <EventRowSkeleton key={i} />)}
                        </div>
                    ) : !data?.items.length ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                            <div className="size-14 rounded-2xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs flex items-center justify-center">
                                <Activity size={22} className="text-muted-foreground/40" strokeWidth={1.5} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-[13px] font-medium text-muted-foreground">Sin actividad registrada</p>
                                <p className="text-[12px] text-muted-foreground/50 max-w-xs">
                                    Las acciones sobre archivos y carpetas aparecerán aquí
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col p-1.5 gap-3">
                            {groups.map((group) => (
                                <section key={group.key}>
                                    <DateHeader label={group.label} />
                                    <div className="flex flex-col gap-0.5">
                                        {group.entries.map((entry) => (
                                            <EventRow key={entry.id} entry={entry} />
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
