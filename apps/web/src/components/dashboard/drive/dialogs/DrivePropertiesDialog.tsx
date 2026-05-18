import { useQuery } from '@tanstack/react-query'
import { api } from '#/lib/api'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import type { DriveItem } from '@intellidocs/types'
import { FileIcon, FolderIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatFileSize } from '#/lib/file-size'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: DriveItem
    workspaceId: string
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/50 last:border-0">
            <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
            <span className="text-xs text-right">{value}</span>
        </div>
    )
}

export function DrivePropertiesDialog({ open, onOpenChange, item, workspaceId }: Props) {
    const { data, isLoading } = useQuery({
        queryKey: ['drive-properties', workspaceId, item.type, item.id],
        queryFn: () =>
            api.get<any>(`/workspaces/${workspaceId}/drive/items/${item.type}/${item.id}/properties`),
        enabled: open,
    })

    const author = data?.type === 'folder' ? data?.createdBy : data?.uploadedBy

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader className="border-b border-b-black/10 dark:border-b-white/10 pb-3">
                    <DialogTitle className="flex items-center gap-2">
                        {item.type === 'folder'
                            ? <FolderIcon size={16} />
                            : <FileIcon size={16} />
                        }
                        Propiedades
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                ) : data ? (
                    <div className="mt-4 flex flex-col">
                        <Row label="Nombre" value={data.name} />
                        <Row label="Tipo" value={data.type === 'folder' ? 'Carpeta' : data.mimeType ?? 'Archivo'} />
                        {data.type === 'file' && data.size && (
                            <Row label="Tamaño" value={formatFileSize(Number(data.size))} />
                        )}
                        {data.type === 'file' && data.versionCount != null && (
                            <Row label="Versiones" value={`v${data.versionCount}`} />
                        )}
                        {data.type === 'folder' && data.itemCount != null && (
                            <Row label="Contenido" value={`${data.itemCount} elementos`} />
                        )}
                        <Row
                            label="Creado"
                            value={format(new Date(data.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                        />
                        <Row
                            label="Modificado"
                            value={format(new Date(data.updatedAt), "d MMM yyyy, HH:mm", { locale: es })}
                        />
                        {author && (
                            <Row
                                label={data.type === 'folder' ? 'Creado por' : 'Subido por'}
                                value={
                                    <span className="flex items-center justify-end gap-1.5">
                                        <Avatar size="sm">
                                            {author.image && <AvatarImage src={author.image} />}
                                            <AvatarFallback>
                                                {author.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {author.name}
                                    </span>
                                }
                            />
                        )}
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}
