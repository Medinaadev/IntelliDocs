import { useForm } from '@tanstack/react-form'
import { Button } from '../ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog'
import z from 'zod'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

import {
    FileUpload,
    FileUploadDropzone,
    FileUploadItem,
    FileUploadItemDelete,
    FileUploadItemPreview,
    FileUploadList,
} from '@/components/ui/file-upload'
import { ImageUp, LayersPlus, X } from 'lucide-react'
import { FILE_LIMITS, formatFileSize } from '#/lib/file-size'
import { api } from '#/lib/api'
import type { ClientWorkspaceData } from '@intellidocs/types'
import { useState } from 'react'
import { toast } from 'sonner'
import { useWorkspacesStore } from '#/stores/workspacesStore'

interface CreateWorkspaceFormValues {
    name: string
    image: File | null
}

export const CreateWorkspaceDialog = ({
    children,
    open: defaultOpen = false,
}: {
    children?: React.ReactNode
    open?: boolean
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const fetchWorkspaces = useWorkspacesStore((s) => s.fetchWorkspaces)

    const form = useForm({
        defaultValues: {
            name: '',
            image: null,
        } as CreateWorkspaceFormValues,
        validators: {
            onChange: z.object({
                name: z
                    .string()
                    .min(2, 'El nombre debe tener al menos 2 caracteres'),
                image: z
                    .instanceof(File)
                    .refine((file) => file.type.startsWith('image/'), {
                        message: 'El archivo debe ser una imagen',
                    })
                    .nullable(),
            }),
        },
        onSubmit: async ({ value }) => {
            const toastId = toast.loading('Creando workspace...')

            try {
                const workspace = await api.post<ClientWorkspaceData>(
                    '/workspaces/create',
                    {
                        name: value.name,
                    },
                )

                if (value.image) {
                    const formData = new FormData()
                    formData.append('image', value.image)

                    await api.patch(
                        `/workspaces/${workspace.id}/image`,
                        formData,
                    )
                }

                // Refrescar la lista inmediatamente sin esperar al evento realtime
                await fetchWorkspaces()
                toast.success('Workspace creado exitosamente', { id: toastId })
                setIsOpen(false)
                form.reset()
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Error al crear el workspace',
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
                            Crear nuevo Workspace
                        </DialogTitle>
                        <DialogDescription>
                            Crea un nuevo workspace para organizar tus proyectos
                            y colaborar con tu equipo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 mt-6">
                        <form.Field name="name">
                            {(field) => (
                                <div className="grid gap-2">
                                    <Label htmlFor="name">
                                        Nombre del Workspace
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Mi nuevo workspace"
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

                        <form.Field name="image">
                            {(field) => (
                                <div className="grid gap-2">
                                    <Label htmlFor="image">
                                        Imagen del Workspace
                                    </Label>
                                    <FileUpload
                                        value={
                                            field.state.value
                                                ? [field.state.value]
                                                : []
                                        }
                                        onValueChange={(files) => {
                                            field.setValue(
                                                files[files.length - 1] || null,
                                            )
                                        }}
                                        maxSize={FILE_LIMITS.WORKSPACE_IMAGE}
                                        accept="image/*"
                                        multiple={false}
                                    >
                                        <FileUploadDropzone className="group relative h-48 overflow-hidden rounded-xl border-2 border-dashed transition-all hover:border-primary/50 hover:bg-accent/5 data-dragging:border-primary data-dragging:bg-primary/5">
                                            {field.state.value ? (
                                                <div className="absolute inset-0">
                                                    <FileUploadList
                                                        forceMount
                                                        className="contents"
                                                    >
                                                        <FileUploadItem
                                                            key={0}
                                                            value={
                                                                field.state
                                                                    .value
                                                            }
                                                            className="absolute inset-0 border-0 p-0 rounded-none overflow-hidden"
                                                        >
                                                            <FileUploadItemPreview className="size-10 w-full h-full rounded-none border-0 bg-transparent [&>img]:w-full [&>img]:h-full [&>img]:object-cover" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                                <FileUploadItemDelete
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="outline"
                                                                        className="bg-white/80 hover:bg-white dark:bg-black/80 dark:hover:bg-black text-red-500 hover:text-red-600"
                                                                        size="sm"
                                                                    >
                                                                        <X className="size-3" />{' '}
                                                                        Quitar
                                                                    </Button>
                                                                </FileUploadItemDelete>
                                                            </div>
                                                        </FileUploadItem>
                                                    </FileUploadList>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
                                                    <div className="flex items-center justify-center rounded-full border bg-background p-2.5 shadow-sm group-data-dragging:scale-110 transition-transform">
                                                        <ImageUp className="size-5 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            Imagen del workspace
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </FileUploadDropzone>
                                        <p className="absolute text-xs text-muted-foreground -bottom-5">
                                            Max size:{' '}
                                            {formatFileSize(
                                                FILE_LIMITS.WORKSPACE_IMAGE,
                                            )}
                                        </p>
                                    </FileUpload>
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
