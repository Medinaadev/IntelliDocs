import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useWorkspaceStore } from '#/stores/workspaceStore'
import { overviewQuery, type OverviewRecentFile } from '#/lib/queries/overview'
import { formatFileSize } from '#/lib/file-size'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Skeleton } from '#/components/ui/skeleton'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    ArrowRight,
    DatabaseZap,
    FileIcon,
    FileImageIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    Folder,
    Tag,
    Users,
} from 'lucide-react'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/dashboard/$workspaceId/')({
    component: RouteComponent,
})

// helpers de formato

function relativeTime(d: string) {
    return formatDistanceToNow(new Date(d), { addSuffix: true, locale: es })
}

function absoluteTime(d: string) {
    return format(new Date(d), 'd MMM yyyy, HH:mm', { locale: es })
}

function authorInitials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
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
    if (mimeType.startsWith('image/'))
        return <FileImageIcon className={cn(cls, 'text-purple-400/80')} />
    return <FileIcon className={cn(cls, 'text-gray-400')} />
}

// badge del plan actual

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
    free: { label: 'Gratis', className: 'bg-black/6 dark:bg-white/8 text-muted-foreground border border-black/8 dark:border-white/10' },
    pro: { label: 'Pro', className: 'bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25' },
    business: { label: 'Business', className: 'bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25' },
    enterprise: { label: 'Empresa', className: 'bg-violet-500/12 text-violet-600 dark:text-violet-400 border border-violet-500/25' },
}

function PlanBadge({ plan }: { plan: string }) {
    const badge = PLAN_BADGE[plan] ?? { label: plan, className: 'bg-black/6 dark:bg-white/8 text-muted-foreground border border-black/8 dark:border-white/10' }
    return (
        <span className={cn('inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full', badge.className)}>
            {badge.label}
        </span>
    )
}

// tarjeta de estadistica

function StatCard({
    label, value, sub, icon, accent, children,
}: {
    label: string
    value: string | number
    sub?: string
    icon: React.ReactNode
    accent: string
    children?: React.ReactNode
}) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 px-4 py-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground/60 truncate">{label}</span>
                    <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
                    {sub && <span className="text-[11px] text-muted-foreground/50 truncate">{sub}</span>}
                </div>
                <span className={cn('size-8 shrink-0 flex items-center justify-center rounded-lg', accent)}>
                    {icon}
                </span>
            </div>
            {children}
        </div>
    )
}

// barra de uso de almacenamiento

function StorageBar({ used, limit }: { used: number; limit: number }) {
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
    const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-blue-500'
    return (
        <div className="flex flex-col gap-1.5">
            <div className="h-1 w-full rounded-full bg-black/8 dark:bg-white/8 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-muted-foreground/50 tabular-nums">
                {formatFileSize(used)} de {formatFileSize(limit)}
            </span>
        </div>
    )
}

// cabecera de seccion

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className="text-[13px] font-semibold">{children}</h2>
}

function ViewAllLink({ to, params, search, label = 'Ver todo' }: {
    to: string
    params?: Record<string, string>
    search?: Record<string, string>
    label?: string
}) {
    return (
        <Link
            to={to}
            params={params}
            search={search}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 text-muted-foreground hover:text-foreground hover:bg-black/6 dark:hover:bg-white/6 hover:border-black/12 dark:hover:border-white/12 transition-all"
        >
            {label}
            <ArrowRight size={12} />
        </Link>
    )
}

// fila de archivo reciente

const FILE_ROW =
    'grid items-center gap-x-3 px-3 py-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5' +
    ' grid-cols-[minmax(0,1fr)_24px]' +
    ' sm:grid-cols-[minmax(0,1fr)_64px_120px_24px]'

function RecentFileRow({ file, workspaceId }: { file: OverviewRecentFile; workspaceId: string }) {
    const uploader = file.uploadedBy

    return (
        <Link
            to="/dashboard/$workspaceId/drive"
            params={{ workspaceId }}
            search={file.folderId ? { folderId: file.folderId } : {}}
            className={FILE_ROW}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-7 rounded-md bg-black/4 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <FileTypeIcon mimeType={file.mimeType} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[13px] font-medium truncate">{file.name}</span>
                        {file.tags.slice(0, 1).map((tag) => (
                            <span
                                key={tag.id}
                                className="hidden lg:inline-flex shrink-0 items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full"
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
                    <span className="sm:hidden text-[11px] text-muted-foreground/50 truncate">
                        {relativeTime(file.updatedAt)}
                    </span>
                </div>
            </div>
            <span className="hidden sm:block text-xs text-muted-foreground text-right tabular-nums">
                {file.size ? formatFileSize(Number(file.size)) : '—'}
            </span>
            <span
                className="hidden sm:block text-xs text-muted-foreground text-right truncate"
                title={absoluteTime(file.updatedAt)}
            >
                {relativeTime(file.updatedAt)}
            </span>
            <Avatar size="sm" className="shrink-0 justify-self-end" title={uploader?.name}>
                {uploader?.image && <AvatarImage src={uploader.image} />}
                <AvatarFallback>{uploader ? authorInitials(uploader.name) : '?'}</AvatarFallback>
            </Avatar>
        </Link>
    )
}

function RecentFilesHeader() {
    return (
        <div className={
            'hidden sm:grid items-center gap-x-3 px-3 py-2 border-b border-black/6 dark:border-white/6 select-none' +
            ' text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/50' +
            ' grid-cols-[minmax(0,1fr)_64px_120px_24px]'
        }>
            <span>Nombre</span>
            <span className="text-right">Tamaño</span>
            <span className="text-right">Modificado</span>
            <span />
        </div>
    )
}

// skeletons de carga

function StatCardSkeleton() {
    return (
        <div className="flex flex-col gap-4 rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 px-4 py-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-7 w-10 rounded" />
                </div>
                <Skeleton className="size-8 rounded-lg shrink-0" />
            </div>
        </div>
    )
}

function FileRowSkeleton() {
    return (
        <div className={FILE_ROW}>
            <div className="flex items-center gap-2.5">
                <Skeleton className="size-7 rounded-md shrink-0" />
                <Skeleton className="h-3.5 w-36 rounded" />
            </div>
            <Skeleton className="hidden sm:block h-3 w-10 rounded ml-auto" />
            <Skeleton className="hidden sm:block h-3 w-20 rounded ml-auto" />
            <Skeleton className="size-5 rounded-full justify-self-end" />
        </div>
    )
}

// pagina principal del workspace

function RouteComponent() {
    const { workspaceId } = Route.useParams()
    const workspace = useWorkspaceStore((s) => s.workspace)
    const { data, isLoading } = useQuery(overviewQuery(workspaceId))

    return (
        <div className="flex flex-col min-h-full">
            {/* cabecera con nombre e imagen del workspace */}
            <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-3">
                    {workspace?.image ? (
                        <img src={workspace.image} alt={workspace.name} className="size-9 rounded-lg object-cover shrink-0" />
                    ) : (
                        <div className="size-9 rounded-lg bg-black/6 dark:bg-white/6 flex items-center justify-center shrink-0">
                            <DatabaseZap size={16} className="text-muted-foreground/70" />
                        </div>
                    )}
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-[15px] font-semibold truncate">{workspace?.name}</h1>
                        {data?.plan && <PlanBadge plan={data.plan} />}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6 px-4 sm:px-6 py-5 sm:py-6">
                {/* tarjetas de stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {isLoading ? (
                        [1,2,3,4].map((i) => <StatCardSkeleton key={i} />)
                    ) : (
                        <>
                            <StatCard
                                label="Archivos"
                                value={data?.fileCount ?? 0}
                                icon={<FileIcon size={15} className="text-blue-500" />}
                                accent="bg-blue-500/10"
                            />
                            <StatCard
                                label="Carpetas"
                                value={data?.folderCount ?? 0}
                                icon={<Folder size={15} className="text-amber-500" />}
                                accent="bg-amber-500/10"
                            />
                            <StatCard
                                label="Miembros"
                                value={data?.memberCount ?? 0}
                                sub={workspace?.seatsLimit ? `de ${workspace.seatsLimit} plazas` : undefined}
                                icon={<Users size={15} className="text-green-500" />}
                                accent="bg-green-500/10"
                            />
                            <StatCard
                                label="Almacenamiento"
                                value={data ? formatFileSize(data.storageUsed) : '—'}
                                icon={<DatabaseZap size={15} className="text-purple-500" />}
                                accent="bg-purple-500/10"
                            >
                                {data && data.storageLimit > 0 && (
                                    <StorageBar used={data.storageUsed} limit={data.storageLimit} />
                                )}
                            </StatCard>
                        </>
                    )}
                </div>

                {/* archivos recientes */}
                <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <SectionTitle>Archivos recientes</SectionTitle>
                        <ViewAllLink to="/dashboard/$workspaceId/drive" params={{ workspaceId }} />
                    </div>

                    <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 overflow-hidden shadow-xs">
                        {isLoading ? (
                            <div className="flex flex-col p-1.5 gap-0.5">
                                {[1,2,3,4,5].map((i) => <FileRowSkeleton key={i} />)}
                            </div>
                        ) : !data?.recentFiles?.length ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                                <div className="size-12 rounded-2xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs flex items-center justify-center">
                                    <FileIcon size={18} className="text-muted-foreground/40" strokeWidth={1.5} />
                                </div>
                                <p className="text-[13px] text-muted-foreground/60">Aún no hay archivos</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <RecentFilesHeader />
                                <div className="flex flex-col gap-0.5 p-1.5">
                                    {data.recentFiles.map((file) => (
                                        <RecentFileRow key={file.id} file={file} workspaceId={workspaceId} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* etiquetas mas usadas */}
                {(data?.topTags?.length ?? 0) > 0 && (
                    <section className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <SectionTitle>
                                Etiquetas{' '}
                                <span className="text-muted-foreground font-normal ml-1 tabular-nums">{data!.tagCount}</span>
                            </SectionTitle>
                            <ViewAllLink
                                to="/dashboard/$workspaceId/labels"
                                params={{ workspaceId }}
                                label="Gestionar"
                            />
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            {data!.topTags.map((tag) => (
                                <Link
                                    key={tag.id}
                                    to="/dashboard/$workspaceId/drive"
                                    params={{ workspaceId }}
                                    search={{ tagId: tag.id }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors hover:opacity-80"
                                    style={{
                                        background: tag.color ? `${tag.color}18` : 'rgba(148,163,184,0.10)',
                                        color: tag.color ?? '#64748b',
                                        border: `1px solid ${tag.color ?? '#94a3b8'}30`,
                                    }}
                                >
                                    <span className="size-1.5 rounded-full shrink-0" style={{ background: tag.color ?? '#94a3b8' }} />
                                    {tag.name}
                                    <span className="text-[10px] opacity-50 tabular-nums">{tag.fileCount}</span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
