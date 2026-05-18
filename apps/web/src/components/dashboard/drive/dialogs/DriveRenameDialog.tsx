import { useEffect, useState } from 'react'
import { api } from '#/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import type { DriveItem } from '@intellidocs/types'
import { PencilLine } from 'lucide-react'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: DriveItem
    workspaceId: string
}

export function DriveRenameDialog({ open, onOpenChange, item, workspaceId }: Props) {
    const [name, setName] = useState(item.name)
    const [loading, setLoading] = useState(false)
    const queryClient = useQueryClient()

    useEffect(() => {
        setName(item.name)
    }, [item.name, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed || trimmed === item.name) { onOpenChange(false); return }

        setLoading(true)
        const toastId = toast.loading('Renombrando...')
        try {
            const endpoint = item.type === 'folder'
                ? `/workspaces/${workspaceId}/drive/folders/${item.id}`
                : `/workspaces/${workspaceId}/drive/files/${item.id}`
            await api.patch(endpoint, { name: trimmed })
            toast.success('Renombrado correctamente', { id: toastId })
            queryClient.invalidateQueries({ queryKey: ['drive', workspaceId] })
            onOpenChange(false)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al renombrar', { id: toastId })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="border-b border-b-black/10 dark:border-b-white/10 pb-3">
                        <DialogTitle className="flex items-center gap-2">
                            <PencilLine size={16} />
                            Renombrar {item.type === 'folder' ? 'carpeta' : 'archivo'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-5 grid gap-2">
                        <Label htmlFor="rename-input">Nuevo nombre</Label>
                        <Input
                            id="rename-input"
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={item.name}
                        />
                    </div>
                    <DialogFooter className="mt-5">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !name.trim() || name.trim() === item.name}
                        >
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
