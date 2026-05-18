import { useForm } from '@tanstack/react-form'
import { Button } from '#/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '#/components/ui/dialog'
import { z } from 'zod'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

import { LayersPlus } from 'lucide-react'
import { api } from '#/lib/api'
import type { ClientWorkspaceData } from '@intellidocs/types'
import { useState } from 'react'
import { toast } from 'sonner'
import { HexColorPicker } from 'react-colorful'
import { useQueryClient } from '@tanstack/react-query'

interface CreateFolderFormValues {
    name: string
    color?: string
}

export const CreateFolderDialog = ({
    children,
    workspaceId,
    currentFolderId,
    open: defaultOpen = false,
}: {
    children?: React.ReactNode
    workspaceId: string
    currentFolderId: string | null
    open?: boolean
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const queryClient = useQueryClient()

    const form = useForm({
        defaultValues: {
            name: '',
            color: undefined,
        } as CreateFolderFormValues,
        validators: {
            onChange: z.object({
                name: z
                    .string()
                    .min(2, 'El nombre debe tener al menos 2 caracteres'),
                color: z.string().optional(),
            }),
        },
        onSubmit: async ({ value }) => {
            const toastId = toast.loading('Creando carpeta...')

            try {
                const folder = await api.post<ClientWorkspaceData>(
                    `/workspaces/${workspaceId}/drive/folders`,
                    {
                        name: value.name,
                        parentId: currentFolderId,
                        color: value.color,
                    },
                )

                toast.success('Carpeta creada exitosamente', { id: toastId })
                queryClient.invalidateQueries({
                    queryKey: ['drive', workspaceId, currentFolderId ?? null],
                })
                setIsOpen(false)
                form.reset()
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Error al crear la carpeta',
                    { id: toastId },
                )
                return
            }
        },
    })

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open)
                if (!open) form.reset()
            }}
        >
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm">
                        Create Workspace
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        form.handleSubmit()
                    }}
                >
                    <DialogHeader className="border-b border-b-black/20 dark:border-b-white/20 pb-2">
                        <DialogTitle className="flex items-center gap-2">
                            <LayersPlus />
                            Crear nueva carpeta
                        </DialogTitle>
                        <DialogDescription>
                            Ingresa el nombre de la nueva carpeta y selecciona
                            un color opcional para organizar tus archivos. La
                            carpeta se creará dentro de la ubicación actual en
                            tu drive.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 mt-6">
                        <form.Field name="name">
                            {(field) => (
                                <div className="grid gap-2">
                                    <Label htmlFor="name">
                                        Nombre de la carpeta
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Mi nueva carpeta"
                                        value={field.state.value}
                                        onChange={(e) =>
                                            field.setValue(e.target.value)
                                        }
                                    />
                                    {!field.state.meta.isValid && (
                                        <em className="text-red-500">
                                            {
                                                field.state.meta.errors[0]
                                                    ?.message
                                            }
                                        </em>
                                    )}
                                </div>
                            )}
                        </form.Field>

                        <form.Field name="color">
                            {(field) => (
                                <div className="grid gap-2">
                                    <Label htmlFor="color">
                                        Color de la carpeta (opcional)
                                    </Label>
                                    <HexColorPicker
                                        color={field.state.value}
                                        onChange={(color) =>
                                            field.setValue(color)
                                        }
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            )}
                        </form.Field>
                    </div>

                    <DialogFooter className="sm:justify-end mt-6">
                        <form.Subscribe selector={(state) => state.canSubmit}>
                            {(canSubmit) => (
                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={!canSubmit}
                                >
                                    Crear
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
