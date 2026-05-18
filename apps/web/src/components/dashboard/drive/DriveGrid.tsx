import type {
    DriveItem,
    DriveItemAuthor,
    DriveFolderItem,
    DriveFileItem,
} from '@intellidocs/types'
import { Link } from '@tanstack/react-router'
import {
    Download,
    Eye,
    FileIcon,
    FileImageIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    FolderIcon,
    History,
    Info,
    Loader2,
    Palette,
    PencilLine,
    Tag,
    Trash2,
    Upload,
} from 'lucide-react'
import { api } from '#/lib/api'
import { formatFileSize } from '#/lib/file-size'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '#/components/ui/context-menu'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { DriveRenameDialog } from './dialogs/DriveRenameDialog'
import { DriveFolderColorDialog } from './dialogs/DriveFolderColorDialog'
import { DriveDeleteDialog } from './dialogs/DriveDeleteDialog'
import { DriveReuploadDialog } from './dialogs/DriveReuploadDialog'
import { DrivePropertiesDialog } from './dialogs/DrivePropertiesDialog'
import { DriveVersionsDialog } from './dialogs/DriveVersionsDialog'
import { DriveFileTagsDialog } from './dialogs/DriveFileTagsDialog'
import { DrivePreviewDialog } from './dialogs/DrivePreviewDialog'

const ROW =
    'grid items-center gap-x-4 px-3' +
    ' grid-cols-[minmax(0,1fr)_28px_24px]' +
    ' sm:grid-cols-[minmax(0,1fr)_72px_40px_28px_24px]' +
    ' md:grid-cols-[minmax(0,1fr)_72px_40px_136px_28px_24px]' +
    ' lg:grid-cols-[minmax(0,1fr)_72px_40px_136px_minmax(0,180px)_28px_24px]'

const relativeTime = (dateStr: string) =>
    formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es })

const absoluteTime = (dateStr: string) =>
    format(new Date(dateStr), 'd MMM yyyy, HH:mm', { locale: es })

function AuthorAvatar({
    author,
}: {
    author: DriveItemAuthor | null | undefined
}) {
    if (!author) return <span />
    const initials = author.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    return (
        <Avatar
            size="sm"
            className="shrink-0 justify-self-end"
            title={author.name}
        >
            {author.image && (
                <AvatarImage src={author.image} alt={author.name} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
    )
}

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
    const cls = 'size-[17px] shrink-0'
    if (!mimeType)
        return (
            <FileIcon className={`${cls} text-gray-400 dark:text-gray-500`} />
        )
    if (mimeType === 'application/pdf')
        return (
            <FileTextIcon
                className={`${cls} text-red-400/80 dark:text-red-400/60`}
            />
        )
    if (
        mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
        return (
            <FileTextIcon
                className={`${cls} text-blue-400/80 dark:text-blue-400/60`}
            />
        )
    if (
        mimeType ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
        return (
            <FileSpreadsheetIcon
                className={`${cls} text-green-400/80 dark:text-green-400/60`}
            />
        )
    if (mimeType.startsWith('image/'))
        return (
            <FileImageIcon
                className={`${cls} text-purple-400/80 dark:text-purple-400/60`}
            />
        )
    return <FileIcon className={`${cls} text-gray-400 dark:text-gray-500`} />
}

function TagChips({ tags }: { tags: DriveFileItem['tags'] }) {
    if (!tags || tags.length === 0) return <span />
    return (
        <div className="hidden lg:flex items-center gap-1 min-w-0 overflow-hidden">
            {tags.slice(0, 2).map((tag) => (
                <span
                    key={tag.id}
                    className="inline-flex items-center shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full truncate max-w-[80px]"
                    style={{
                        background: tag.color
                            ? `${tag.color}18`
                            : 'rgba(148,163,184,0.12)',
                        color: tag.color ?? undefined,
                        border: `1px solid ${tag.color ?? '#94a3b8'}35`,
                    }}
                    title={tag.name}
                >
                    {tag.name}
                </span>
            ))}
            {tags.length > 2 && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                    +{tags.length - 2}
                </span>
            )}
        </div>
    )
}

type Action =
    | 'preview'
    | 'rename'
    | 'color'
    | 'delete'
    | 'reupload'
    | 'properties'
    | 'versions'
    | 'tags'

function TableHeader() {
    return (
        <div
            className={
                ROW +
                ' py-2.5 border-b border-black/6 dark:border-white/6 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/50 select-none'
            }
        >
            {/* nombre */}
            <span>Nombre</span>
            {/* tamano */}
            <span className="hidden sm:block text-right">Tamaño</span>
            {/* version */}
            <span className="hidden sm:block text-right">Ver.</span>
            {/* actualizado */}
            <span className="hidden md:block text-right">Actualizado</span>
            {/* etiquetas */}
            <span className="hidden lg:block">Etiquetas</span>
            {/* descarga, sin label */}
            <span />
            {/* autor, sin label */}
            <span />
        </div>
    )
}

// fila de carpeta

function FolderRow({
    item,
    workspaceId,
    onAction,
}: {
    item: DriveFolderItem
    workspaceId: string
    onAction: (action: Action, item: DriveItem) => void
}) {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <Link
                    to="/dashboard/$workspaceId/drive"
                    params={{ workspaceId }}
                    search={{ folderId: item.id }}
                    className={
                        ROW +
                        ' py-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer group'
                    }
                >
                    {/* nombre con icono de color */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div
                            className="size-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: item.color ? `${item.color}18` : 'rgba(251,191,36,0.10)' }}
                        >
                            <FolderIcon
                                size={16}
                                style={{ color: item.color ?? '#f59e0b' }}
                                fill={item.color ?? '#f59e0b'}
                            />
                        </div>
                        <span className="text-[13px] font-medium truncate">
                            {item.name}
                        </span>
                    </div>
                    {/* tamano vacio en carpetas */}
                    <span className="hidden sm:block text-xs text-muted-foreground text-right">
                        —
                    </span>
                    {/* version vacia en carpetas */}
                    <span className="hidden sm:block text-xs text-muted-foreground text-right">
                        —
                    </span>
                    {/* fecha actualizacion */}
                    <span
                        className="hidden md:block text-xs text-muted-foreground text-right truncate"
                        title={absoluteTime(item.updatedAt)}
                    >
                        {relativeTime(item.updatedAt)}
                    </span>
                    {/* hueco para alinear con FileRow */}
                    <span className="hidden lg:block" />
                    {/* hueco descarga, mantiene alineacion con FileRow */}
                    <span />
                    {/* avatar del que creo la carpeta */}
                    <AuthorAvatar author={item.createdBy} />
                </Link>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={() => onAction('properties', item)}>
                    <Info size={14} /> Propiedades
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onAction('rename', item)}>
                    <PencilLine size={14} /> Renombrar
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onAction('color', item)}>
                    <Palette size={14} /> Cambiar color
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                    variant="destructive"
                    onClick={() => onAction('delete', item)}
                >
                    <Trash2 size={14} /> Eliminar
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

// fila de archivo

function FileRow({
    item,
    workspaceId,
    onAction,
}: {
    item: DriveFileItem
    workspaceId: string
    onAction: (action: Action, item: DriveItem) => void
}) {
    const [downloading, setDownloading] = useState(false)

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (downloading) return
        setDownloading(true)
        try {
            const data = await api.get<{ url: string; filename: string }>(
                `/workspaces/${workspaceId}/drive/files/${item.id}/download`,
            )
            const a = document.createElement('a')
            a.href = data.url
            a.download = data.filename
            a.target = '_blank'
            a.rel = 'noopener noreferrer'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } finally {
            setDownloading(false)
        }
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className={
                        ROW +
                        ' py-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer group'
                    }
                    onClick={() => onAction('preview', item)}
                >
                    {/* nombre con icono segun tipo */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-lg bg-black/4 dark:bg-white/5 flex items-center justify-center shrink-0">
                            <FileTypeIcon mimeType={item.mimeType} />
                        </div>
                        <span className="text-[13px] font-medium truncate">
                            {item.name}
                        </span>
                    </div>
                    {/* tamano del archivo */}
                    <span className="hidden sm:block text-xs text-muted-foreground text-right tabular-nums">
                        {item.size ? formatFileSize(Number(item.size)) : '—'}
                    </span>
                    {/* numero de version */}
                    <span className="hidden sm:block text-xs text-muted-foreground text-right tabular-nums">
                        v{item.versionNumber}
                    </span>
                    {/* cuando se actualizo */}
                    <span
                        className="hidden md:block text-xs text-muted-foreground text-right truncate"
                        title={absoluteTime(item.updatedAt)}
                    >
                        {relativeTime(item.updatedAt)}
                    </span>
                    {/* chips de etiquetas */}
                    <TagChips tags={item.tags} />
                    {/* boton descargar, se ve al hover */}
                    <button
                        onClick={handleDownload}
                        title="Descargar"
                        className="size-7 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-foreground hover:bg-black/8 dark:hover:bg-white/8 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        {downloading
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Download size={13} />
                        }
                    </button>
                    {/* avatar del que subio */}
                    <AuthorAvatar author={item.uploadedBy} />
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={() => onAction('preview', item)}>
                    <Eye size={14} /> Abrir
                </ContextMenuItem>
                <ContextMenuItem onClick={handleDownload}>
                    <Download size={14} /> Descargar
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onAction('properties', item)}>
                    <Info size={14} /> Propiedades
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onAction('rename', item)}>
                    <PencilLine size={14} /> Renombrar
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onAction('versions', item)}>
                    <History size={14} /> Ver versiones
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onAction('reupload', item)}>
                    <Upload size={14} /> Resubir versión
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onAction('tags', item)}>
                    <Tag size={14} /> Etiquetas
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                    variant="destructive"
                    onClick={() => onAction('delete', item)}
                >
                    <Trash2 size={14} /> Eliminar
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

// label de seccion con contador

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

// grid principal con carpetas y archivos

export function DriveGrid({
    items,
    workspaceId,
}: {
    items: DriveItem[]
    workspaceId: string
}) {
    const [activeAction, setActiveAction] = useState<{
        action: Action
        item: DriveItem
    } | null>(null)

    const onAction = (action: Action, item: DriveItem) =>
        setActiveAction({ action, item })
    const close = () => setActiveAction(null)

    const folders = items.filter(
        (i): i is DriveFolderItem => i.type === 'folder',
    )
    const files = items.filter((i): i is DriveFileItem => i.type === 'file')

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <div className="size-14 rounded-2xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs flex items-center justify-center">
                    <FolderIcon size={22} className="text-muted-foreground/40" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1">
                    <p className="text-[13px] font-medium text-muted-foreground">Esta carpeta está vacía</p>
                    <p className="text-[12px] text-muted-foreground/50">Sube archivos o crea una carpeta para empezar</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs overflow-hidden">
                    <TableHeader />

                    <div className="p-1.5 flex flex-col gap-3">
                        {folders.length > 0 && (
                            <section>
                                <SectionLabel label="Carpetas" count={folders.length} />
                                <div className="flex flex-col gap-0.5">
                                    {folders.map((folder) => (
                                        <FolderRow
                                            key={folder.id}
                                            item={folder}
                                            workspaceId={workspaceId}
                                            onAction={onAction}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {files.length > 0 && (
                            <section>
                                <SectionLabel label="Archivos" count={files.length} />
                                <div className="flex flex-col gap-0.5">
                                    {files.map((file) => (
                                        <FileRow
                                            key={file.id}
                                            item={file}
                                            workspaceId={workspaceId}
                                            onAction={onAction}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>

            {/* dialogs segun la accion activa */}
            {activeAction?.action === 'rename' && (
                <DriveRenameDialog
                    open
                    onOpenChange={close}
                    item={activeAction.item}
                    workspaceId={workspaceId}
                />
            )}
            {activeAction?.action === 'color' &&
                activeAction.item.type === 'folder' && (
                    <DriveFolderColorDialog
                        open
                        onOpenChange={close}
                        item={activeAction.item}
                        workspaceId={workspaceId}
                    />
                )}
            {activeAction?.action === 'delete' && (
                <DriveDeleteDialog
                    open
                    onOpenChange={close}
                    item={activeAction.item}
                    workspaceId={workspaceId}
                />
            )}
            {activeAction?.action === 'reupload' &&
                activeAction.item.type === 'file' && (
                    <DriveReuploadDialog
                        open
                        onOpenChange={close}
                        item={activeAction.item}
                        workspaceId={workspaceId}
                    />
                )}
            {activeAction?.action === 'properties' && (
                <DrivePropertiesDialog
                    open
                    onOpenChange={close}
                    item={activeAction.item}
                    workspaceId={workspaceId}
                />
            )}
            {activeAction?.action === 'versions' &&
                activeAction.item.type === 'file' && (
                    <DriveVersionsDialog
                        open
                        onOpenChange={close}
                        item={activeAction.item}
                        workspaceId={workspaceId}
                    />
                )}
            {activeAction?.action === 'tags' &&
                activeAction.item.type === 'file' && (
                    <DriveFileTagsDialog
                        open
                        onOpenChange={close}
                        item={activeAction.item}
                        workspaceId={workspaceId}
                    />
                )}
            {activeAction?.action === 'preview' &&
                activeAction.item.type === 'file' && (
                    <DrivePreviewDialog
                        open
                        onOpenChange={close}
                        item={activeAction.item}
                        workspaceId={workspaceId}
                    />
                )}
        </>
    )
}
