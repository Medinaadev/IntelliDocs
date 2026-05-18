import { useEffect, useState } from 'react'
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
import type { DriveFolderItem } from '@intellidocs/types'
import { Palette, X } from 'lucide-react'
import { HexColorPicker } from 'react-colorful'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: DriveFolderItem
    workspaceId: string
}

export function DriveFolderColorDialog({ open, onOpenChange, item, workspaceId }: Props) {
    const [color, setColor] = useState<string | undefined>(item.color ?? undefined)
    const [loading, setLoading] = useState(false)
    const queryClient = useQueryClient()

    useEffect(() => {
        setColor(item.color ?? undefined)
    }, [item.color, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const toastId = toast.loading('Guardando color...')
        try {
            await api.patch(`/workspaces/${workspaceId}/drive/folders/${item.id}`, {
                color: color ?? null,
            })
            toast.success('Color actualizado', { id: toastId })
            queryClient.invalidateQueries({ queryKey: ['drive', workspaceId] })
            onOpenChange(false)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al guardar', { id: toastId })
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
                            <Palette size={16} />
                            Color de carpeta
                        </DialogTitle>
                    </DialogHeader>

                    <div className="mt-5 flex flex-col gap-4">
                        <HexColorPicker
                            color={color ?? '#6366f1'}
                            onChange={setColor}
                            style={{ width: '100%' }}
                        />
                        {color && (
                            <button
                                type="button"
                                onClick={() => setColor(undefined)}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
                            >
                                <X size={12} />
                                Quitar color
                            </button>
                        )}
                    </div>

                    <DialogFooter className="mt-5">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
