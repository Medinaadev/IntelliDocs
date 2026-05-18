import { useRef, useState } from 'react'
import { getApiUrl } from '#/lib/api'
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
import type { DriveFileItem } from '@intellidocs/types'
import {
    CloudUpload,
    FileIcon,
    FileImageIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    Loader2,
    Upload,
    X,
} from 'lucide-react'
import { formatFileSize } from '#/lib/file-size'
import { cn } from '#/lib/utils'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: DriveFileItem
    workspaceId: string
}

// icono segun tipo de archivo

function FileTypeIcon({ mimeType, size = 16 }: { mimeType: string | null; size?: number }) {
    const cls = 'shrink-0'
    if (!mimeType) return <FileIcon size={size} className={cn(cls, 'text-gray-400')} />
    if (mimeType === 'application/pdf')
        return <FileTextIcon size={size} className={cn(cls, 'text-red-400/80')} />
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        return <FileTextIcon size={size} className={cn(cls, 'text-blue-400/80')} />
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        return <FileSpreadsheetIcon size={size} className={cn(cls, 'text-green-400/80')} />
    if (mimeType?.startsWith('image/'))
        return <FileImageIcon size={size} className={cn(cls, 'text-purple-400/80')} />
    return <FileIcon size={size} className={cn(cls, 'text-gray-400')} />
}

// dialog para subir nueva version

export function DriveReuploadDialog({ open, onOpenChange, item, workspaceId }: Props) {
    const [file, setFile] = useState<File | null>(null)
    const [progress, setProgress] = useState(0)
    const [loading, setLoading] = useState(false)
    const [dragging, setDragging] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const queryClient = useQueryClient()

    const reset = () => {
        setFile(null)
        setProgress(0)
    }

    const handleClose = (v: boolean) => {
        if (!loading) {
            reset()
            onOpenChange(v)
        }
    }

    const pickFile = (f: File) => setFile(f)

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) pickFile(f)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        setProgress(0)
        const toastId = toast.loading('Subiendo nueva versión...')

        const formData = new FormData()
        formData.append('file', file)

        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100))
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                toast.success('Nueva versión subida correctamente', { id: toastId })
                queryClient.invalidateQueries({ queryKey: ['drive', workspaceId] })
                queryClient.invalidateQueries({ queryKey: ['file-versions', workspaceId, item.id] })
                setLoading(false)
                reset()
                onOpenChange(false)
            } else {
                try {
                    const body = JSON.parse(xhr.responseText)
                    toast.error(body.message ?? 'Error al subir', { id: toastId })
                } catch {
                    toast.error('Error al subir', { id: toastId })
                }
                setLoading(false)
            }
        }

        xhr.onerror = () => {
            toast.error('Error de red', { id: toastId })
            setLoading(false)
        }

        xhr.open('POST', getApiUrl(`/workspaces/${workspaceId}/drive/files/${item.id}/versions`))
        xhr.withCredentials = true
        xhr.send(formData)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
                <form onSubmit={handleSubmit}>
                    {/* cabecera con nombre del archivo actual */}
                    <DialogHeader className="px-5 pt-5 pb-4 border-b border-black/8 dark:border-white/8">
                        <DialogTitle className="flex items-center gap-2 text-[15px]">
                            <Upload size={15} className="text-muted-foreground shrink-0" />
                            Nueva versión
                        </DialogTitle>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="size-4 flex items-center justify-center shrink-0">
                                <FileTypeIcon mimeType={item.mimeType ?? null} size={12} />
                            </div>
                            <span className="text-[12px] text-muted-foreground/60 truncate">
                                {item.name}
                            </span>
                        </div>
                    </DialogHeader>

                    <div className="px-5 py-5 flex flex-col gap-4">

                        {/* si ya eligio archivo lo muestra, si no el dropzone */}
                        {file ? (
                            <div className="flex items-center gap-3 rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3">
                                <div className="size-9 rounded-lg bg-black/5 dark:bg-white/6 flex items-center justify-center shrink-0">
                                    <FileTypeIcon mimeType={file.type || null} size={16} />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                    <span className="text-[13px] font-medium truncate">{file.name}</span>
                                    <span className="text-[11px] text-muted-foreground/60">
                                        {formatFileSize(file.size)}
                                    </span>
                                </div>
                                {!loading && (
                                    <button
                                        type="button"
                                        onClick={() => setFile(null)}
                                        className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-black/8 dark:hover:bg-white/8 transition-colors shrink-0"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                className={cn(
                                    'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-all text-center',
                                    dragging
                                        ? 'border-primary/50 bg-primary/[0.04] text-foreground'
                                        : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <div className={cn(
                                    'size-11 rounded-xl flex items-center justify-center transition-colors',
                                    dragging ? 'bg-primary/10' : 'bg-black/5 dark:bg-white/6',
                                )}>
                                    <CloudUpload size={20} className={dragging ? 'text-primary' : ''} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[13px] font-medium">
                                        {dragging ? 'Suelta el archivo aquí' : 'Arrastra o haz clic para seleccionar'}
                                    </span>
                                    <span className="text-[12px] text-muted-foreground/60">
                                        Reemplazará la versión activa del archivo
                                    </span>
                                </div>
                            </button>
                        )}

                        <input
                            ref={inputRef}
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) pickFile(f)
                                e.target.value = ''
                            }}
                        />

                        {/* barra de progreso mientras sube */}
                        {loading && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Loader2 size={11} className="animate-spin" />
                                        Subiendo…
                                    </span>
                                    <span className="tabular-nums font-medium">{progress}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-black/8 dark:bg-white/8 overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-150"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="px-5 pb-5">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleClose(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={!file || loading}>
                            {loading
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Upload size={13} />}
                            Subir versión
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
