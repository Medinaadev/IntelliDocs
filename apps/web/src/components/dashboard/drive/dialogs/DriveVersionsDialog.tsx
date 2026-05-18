import { useQuery } from '@tanstack/react-query'
import { api } from '#/lib/api'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import type { DriveFileItem } from '@intellidocs/types'
import {
    CheckCircle2,
    Clock,
    Download,
    FileText,
    History,
    Loader2,
    Weight,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatFileSize } from '#/lib/file-size'
import { toast } from 'sonner'
import { useState } from 'react'
import { cn } from '#/lib/utils'

interface FileVersion {
    id: string
    versionNumber: number
    mimeType: string | null
    size: string | null
    extension: string | null
    label: string | null
    comment: string | null
    isActive: boolean
    uploadedBy: { id: string; name: string; image: string | null }
    createdAt: string
}

interface VersionsResponse {
    fileId: string
    fileName: string
    activeVersionId: string | null
    versions: FileVersion[]
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: DriveFileItem
    workspaceId: string
}

function authorInitials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

// skeleton mientras cargan las versiones

function VersionRowSkeleton() {
    return (
        <div className="flex items-start gap-4 px-4 py-4">
            <Skeleton className="size-9 rounded-lg shrink-0" />
            <div className="flex flex-col gap-2 flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                    <Skeleton className="size-6 rounded-full shrink-0" />
                    <Skeleton className="h-3.5 w-32 rounded" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-3 w-14 rounded" />
                </div>
            </div>
            <Skeleton className="size-8 rounded-md shrink-0" />
        </div>
    )
}

// fila de cada version del archivo

function VersionRow({
    version,
    isLast,
    downloading,
    onDownload,
}: {
    version: FileVersion
    isLast: boolean
    downloading: boolean
    onDownload: () => void
}) {
    const date = new Date(version.createdAt)

    return (
        <div
            className={cn(
                'relative flex items-start gap-4 px-4 py-4 group transition-colors',
                version.isActive
                    ? 'bg-green-500/[0.04] dark:bg-green-500/[0.06]'
                    : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]',
                !isLast && 'border-b border-black/5 dark:border-white/5',
            )}
        >
            {/* badge con el numero de version */}
            <div
                className={cn(
                    'size-9 rounded-lg flex flex-col items-center justify-center shrink-0 border',
                    version.isActive
                        ? 'bg-green-500/10 border-green-500/25 text-green-600 dark:text-green-400'
                        : 'bg-black/5 dark:bg-white/6 border-black/8 dark:border-white/10 text-muted-foreground',
                )}
            >
                <span className="text-[10px] font-bold tabular-nums leading-none tracking-tight">
                    v{version.versionNumber}
                </span>
            </div>

            {/* contenido de la fila */}
            <div className="flex flex-col min-w-0 flex-1 gap-1.5">

                {/* quien subio + badge activa si aplica */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Avatar className="size-5 shrink-0">
                        {version.uploadedBy.image && (
                            <AvatarImage src={version.uploadedBy.image} />
                        )}
                        <AvatarFallback className="text-[8px]">
                            {authorInitials(version.uploadedBy.name)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-[13px] font-medium truncate">
                        {version.uploadedBy.name}
                    </span>
                    {version.isActive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 shrink-0">
                            <CheckCircle2 size={9} />
                            Activa
                        </span>
                    )}
                    {version.label && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/6 dark:bg-white/8 text-muted-foreground border border-black/8 dark:border-white/10 shrink-0">
                            {version.label}
                        </span>
                    )}
                </div>

                {/* fecha y tamano */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60"
                        title={format(date, "d MMM yyyy, HH:mm", { locale: es })}
                    >
                        <Clock size={10} className="shrink-0" />
                        {formatDistanceToNow(date, { addSuffix: true, locale: es })}
                    </span>
                    {version.size && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60">
                            <Weight size={10} className="shrink-0" />
                            {formatFileSize(Number(version.size))}
                        </span>
                    )}
                </div>

                {/* comentario de la version si tiene */}
                {version.comment && (
                    <p className="text-[12px] text-muted-foreground/70 leading-relaxed mt-0.5 pl-1 border-l-2 border-black/10 dark:border-white/10">
                        {version.comment}
                    </p>
                )}
            </div>

            {/* boton descargar esta version */}
            <Button
                variant="outline"
                size="sm"
                className="shrink-0 size-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={downloading}
                onClick={onDownload}
                title={`Descargar v${version.versionNumber}`}
            >
                {downloading
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Download size={13} />}
            </Button>
        </div>
    )
}

// dialog principal del historial

export function DriveVersionsDialog({ open, onOpenChange, item, workspaceId }: Props) {
    const [downloading, setDownloading] = useState<string | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['file-versions', workspaceId, item.id],
        queryFn: () =>
            api.get<VersionsResponse>(
                `/workspaces/${workspaceId}/drive/files/${item.id}/versions`,
            ),
        enabled: open,
    })

    const handleDownload = async (version: FileVersion) => {
        setDownloading(version.id)
        try {
            const { url } = await api.get<{ url: string; versionNumber: number }>(
                `/workspaces/${workspaceId}/drive/files/${item.id}/versions/${version.id}/download`,
            )
            const a = document.createElement('a')
            a.href = url
            a.download = `${item.name.replace(/\.[^/.]+$/, '')} v${version.versionNumber}${version.extension ? `.${version.extension}` : ''}`
            a.target = '_blank'
            a.rel = 'noopener noreferrer'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } catch {
            toast.error('No se pudo obtener la URL de descarga')
        } finally {
            setDownloading(null)
        }
    }

    const versions = data?.versions ?? []

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-4 border-b border-black/8 dark:border-white/8">
                    <DialogTitle className="flex items-center gap-2 text-[15px]">
                        <History size={15} className="text-muted-foreground shrink-0" />
                        Historial de versiones
                    </DialogTitle>
                    <p className="text-[12px] text-muted-foreground/60 flex items-center gap-1.5 mt-0.5">
                        <FileText size={11} className="shrink-0" />
                        <span className="truncate">{item.name}</span>
                        {versions.length > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-black/6 dark:bg-white/8 text-[10px] font-semibold text-muted-foreground tabular-nums shrink-0">
                                {versions.length}
                            </span>
                        )}
                    </p>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
                            {[1, 2, 3].map((i) => <VersionRowSkeleton key={i} />)}
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                            <div className="size-12 rounded-2xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs flex items-center justify-center">
                                <History size={20} className="text-muted-foreground/40" strokeWidth={1.5} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-[13px] font-medium text-muted-foreground">Sin historial</p>
                                <p className="text-[12px] text-muted-foreground/50">
                                    No hay versiones registradas para este archivo
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {versions.map((version, i) => (
                                <VersionRow
                                    key={version.id}
                                    version={version}
                                    isLast={i === versions.length - 1}
                                    downloading={downloading === version.id}
                                    onDownload={() => handleDownload(version)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
