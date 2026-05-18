import { useState } from 'react'
import { api } from '#/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import type { DriveItem } from '@intellidocs/types'
import { Trash2 } from 'lucide-react'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: DriveItem
    workspaceId: string
}

export function DriveDeleteDialog({ open, onOpenChange, item, workspaceId }: Props) {
    const [loading, setLoading] = useState(false)
    const queryClient = useQueryClient()

    const handleDelete = async () => {
        setLoading(true)
        const toastId = toast.loading('Moviendo a la papelera...')
        try {
            const endpoint = item.type === 'folder'
                ? `/workspaces/${workspaceId}/drive/folders/${item.id}`
                : `/workspaces/${workspaceId}/drive/files/${item.id}`
            await api.delete(endpoint)
            toast.success(`${item.type === 'folder' ? 'Carpeta' : 'Archivo'} movido a la papelera`, { id: toastId })
            queryClient.invalidateQueries({ queryKey: ['drive', workspaceId] })
            queryClient.invalidateQueries({ queryKey: ['trash', workspaceId] })
            queryClient.invalidateQueries({ queryKey: ['overview', workspaceId] })
            onOpenChange(false)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al eliminar', { id: toastId })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader className="border-b border-b-black/10 dark:border-b-white/10 pb-3">
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 size={16} />
                        Mover a la papelera
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-5">
                    <p className="text-sm text-muted-foreground">
                        ¿Seguro que quieres mover{' '}
                        <span className="font-medium text-foreground">"{item.name}"</span>{' '}
                        a la papelera?
                        {item.type === 'folder' && (
                            <> Todo el contenido de la carpeta también será movido.</>
                        )}
                    </p>
                </div>

                <DialogFooter className="mt-5">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={loading}
                        onClick={handleDelete}
                    >
                        Mover a papelera
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
