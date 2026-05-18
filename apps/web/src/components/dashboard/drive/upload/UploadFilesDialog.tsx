import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import {
    FileUpload,
    FileUploadDropzone,
    FileUploadItem,
    FileUploadItemDelete,
    FileUploadItemProgress,
    FileUploadList,
    FileUploadTrigger,
    useFileUpload,
} from '#/components/ui/file-upload'
import { Button } from '#/components/ui/button'
import { getApiUrl } from '#/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    CloudUpload,
    FileIcon,
    FileImageIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    Loader2,
    Upload,
    X,
} from 'lucide-react'
import { useRef } from 'react'
import { formatFileSize } from '#/lib/file-size'
import { cn } from '#/lib/utils'

// icono segun mime type del archivo

function FileTypeIcon({ file, size = 15 }: { file: File; size?: number }) {
    const t = file.type
    if (t === 'application/pdf')
        return <FileTextIcon size={size} className="text-red-400/80 shrink-0" />
    if (t === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        return <FileTextIcon size={size} className="text-blue-400/80 shrink-0" />
    if (t === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        return <FileSpreadsheetIcon size={size} className="text-green-400/80 shrink-0" />
    if (t.startsWith('image/'))
        return <FileImageIcon size={size} className="text-purple-400/80 shrink-0" />
    return <FileIcon size={size} className="text-gray-400 shrink-0" />
}

// fila de archivo, recibe el estado como props para no suscribirse al store

type FileItemStatus = 'idle' | 'uploading' | 'success' | 'error'

function FileItemRow({
    file,
    status,
    progress,
    errorMsg,
}: {
    file: File
    status: FileItemStatus
    progress: number
    errorMsg: string | null | undefined
}) {
    return (
        <>
            <div className="size-9 rounded-lg bg-black/5 dark:bg-white/6 flex items-center justify-center shrink-0">
                <FileTypeIcon file={file} />
            </div>

            <div className="flex flex-col flex-1 min-w-0 gap-1">
                <div className="flex items-center gap-2 min-w-0">
                    {/* nombre y tamano */}
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[13px] font-medium truncate leading-snug max-w-[240px]">{file.name}</span>
                        <span className="text-[11px] text-muted-foreground/60 leading-snug tabular-nums">
                            {formatFileSize(file.size)}
                        </span>
                        {status === 'error' && errorMsg && (
                            <span className="text-[11px] text-red-500/80 leading-snug">{errorMsg}</span>
                        )}
                    </div>

                    {/* badge de estado */}
                    {status === 'uploading' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0 tabular-nums">
                            <Loader2 size={9} className="animate-spin" />
                            {progress >= 100 ? 'Procesando…' : `${progress}%`}
                        </span>
                    )}
                    {status === 'success' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 shrink-0">
                            <CheckCircle2 size={9} />
                            Listo
                        </span>
                    )}
                    {status === 'error' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
                            <AlertCircle size={9} />
                            Error
                        </span>
                    )}
                    {status === 'idle' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/6 dark:bg-white/8 text-muted-foreground border border-black/8 dark:border-white/10 shrink-0">
                            <Clock size={9} />
                            En cola
                        </span>
                    )}
                </div>

                {status === 'uploading' && (
                    <FileUploadItemProgress className="h-1 w-full" />
                )}
            </div>

            <FileUploadItemDelete asChild>
                <button
                    type="button"
                    className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-black/8 dark:hover:bg-white/8 transition-colors shrink-0"
                >
                    <X size={13} />
                </button>
            </FileUploadItemDelete>
        </>
    )
}

// lista de archivos en cola/subiendo

function FileListSection() {
    // esta seccion tiene la unica suscripcion al store, el estado baja como props
    const entries = useFileUpload((s) => Array.from(s.files.entries()))
    if (entries.length === 0) return null

    return (
        <div className="border-t border-black/6 dark:border-white/6 overflow-hidden">
            <FileUploadList className="flex flex-col w-full max-h-[260px] overflow-x-hidden overflow-y-auto p-2 gap-0.5">
                {entries.map(([file, state]) => (
                    <FileUploadItem
                        key={file.name + file.size}
                        value={file}
                        className={cn(
                            'flex items-center gap-3 rounded-xl border-0 bg-transparent min-w-0 overflow-hidden',
                            'px-3 py-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors',
                        )}
                    >
                        <FileItemRow
                            file={file}
                            status={state.status}
                            progress={state.progress}
                            errorMsg={state.error ?? null}
                        />
                    </FileUploadItem>
                ))}
            </FileUploadList>
        </div>
    )
}

// footer con resumen del progreso

function UploadFooter({ onClose }: { onClose: () => void }) {
    // selectores primitivos para que Object.is() detecte bien los cambios
    const total     = useFileUpload((s) => s.files.size)
    const uploading = useFileUpload((s) => Array.from(s.files.values()).filter((f) => f.status === 'uploading').length)
    const done      = useFileUpload((s) => Array.from(s.files.values()).filter((f) => f.status === 'success').length)
    const errors    = useFileUpload((s) => Array.from(s.files.values()).filter((f) => f.status === 'error').length)
    const summary = { total, uploading, done, errors }

    return (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-black/6 dark:border-white/6">
            <span className="text-[12px] text-muted-foreground/60 tabular-nums">
                {summary.total === 0 ? (
                    'Máx. 4 archivos · 100 MB por archivo'
                ) : summary.uploading > 0 ? (
                    <>Subiendo <strong className="text-foreground/70">{summary.uploading}</strong> de {summary.total}…</>
                ) : summary.errors > 0 ? (
                    <>{summary.done} listos · <span className="text-red-500">{summary.errors} con error</span></>
                ) : (
                    <>{summary.done} de {summary.total} {summary.total === 1 ? 'archivo subido' : 'archivos subidos'}</>
                )}
            </span>
            <Button variant="outline" size="sm" onClick={onClose} className="shrink-0">
                Cerrar
            </Button>
        </div>
    )
}

// dialog principal de subida

interface UploadFilesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    workspaceId: string
    folderId: string
}

export function UploadFilesDialog({
    open,
    onOpenChange,
    workspaceId,
    folderId,
}: UploadFilesDialogProps) {
    const queryClient = useQueryClient()
    const activeXhrs = useRef<Map<File, XMLHttpRequest>>(new Map())

    const handleValueChange = (files: File[]) => {
        const current = new Set(files)
        for (const [file, xhr] of activeXhrs.current.entries()) {
            if (!current.has(file)) {
                xhr.abort()
                activeXhrs.current.delete(file)
            }
        }
    }

    const handleUpload = async (
        files: File[],
        {
            onProgress,
            onSuccess,
            onError,
        }: {
            onProgress: (file: File, progress: number) => void
            onSuccess: (file: File) => void
            onError: (file: File, error: Error) => void
        },
    ) => {
        await Promise.all(
            files.map(
                (file) =>
                    new Promise<void>((resolve, reject) => {
                        const formData = new FormData()
                        formData.append('file', file)
                        formData.append('folderId', folderId)

                        const xhr = new XMLHttpRequest()
                        activeXhrs.current.set(file, xhr)

                        xhr.open('POST', getApiUrl(`/workspaces/${workspaceId}/drive/files`))
                        xhr.withCredentials = true

                        xhr.upload.onprogress = (e) => {
                            if (e.lengthComputable)
                                onProgress(file, Math.round((e.loaded / e.total) * 100))
                        }

                        xhr.onload = () => {
                            activeXhrs.current.delete(file)
                            if (xhr.status >= 200 && xhr.status < 300) {
                                onSuccess(file)
                            } else {
                                let message = 'Error al subir el archivo'
                                try { message = JSON.parse(xhr.responseText)?.message ?? message } catch {}
                                onError(file, new Error(message))
                            }
                            resolve()
                        }

                        xhr.onerror = () => {
                            activeXhrs.current.delete(file)
                            onError(file, new Error('Error de red'))
                            resolve()
                        }

                        xhr.onabort = () => {
                            activeXhrs.current.delete(file)
                            resolve()
                        }

                        xhr.send(formData)
                    }),
            ),
        )

        queryClient.invalidateQueries({ queryKey: ['drive', workspaceId, folderId] })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
                <FileUpload
                    multiple
                    maxSize={100 * 1024 * 1024}
                    maxFiles={4}
                    accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
                    onUpload={handleUpload}
                    onValueChange={handleValueChange}
                    className="flex flex-col gap-0"
                >
                    {/* cabecera */}
                    <DialogHeader className="px-5 pt-5 pb-4 border-b border-black/8 dark:border-white/8">
                        <DialogTitle className="flex items-center gap-2 text-[15px]">
                            <Upload size={15} className="text-muted-foreground shrink-0" />
                            Subir archivos
                        </DialogTitle>
                        <p className="text-[12px] text-muted-foreground/60 mt-0.5">
                            PDF, DOCX, XLSX, JPEG, PNG
                        </p>
                    </DialogHeader>

                    {/* zona de arrastrar archivos */}
                    <div className="px-5 py-5">
                        <FileUploadDropzone className={cn(
                            'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all',
                            'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20',
                            'data-[dragging]:border-primary/50 data-[dragging]:bg-primary/[0.04]',
                            'cursor-pointer',
                        )}>
                            <div className="size-12 rounded-xl bg-black/5 dark:bg-white/6 flex items-center justify-center data-[dragging]:bg-primary/10">
                                <CloudUpload size={22} className="text-muted-foreground" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-[13px] font-medium text-foreground/80">
                                    Arrastra archivos aquí
                                </p>
                                <p className="text-[12px] text-muted-foreground/60">
                                    o haz clic para seleccionarlos
                                </p>
                            </div>
                            <FileUploadTrigger asChild>
                                <Button variant="outline" size="sm" type="button">
                                    Seleccionar archivos
                                </Button>
                            </FileUploadTrigger>
                        </FileUploadDropzone>
                    </div>

                    {/* lista de archivos seleccionados */}
                    <FileListSection />

                    {/* footer con resumen y boton cerrar */}
                    <UploadFooter onClose={() => onOpenChange(false)} />
                </FileUpload>
            </DialogContent>
        </Dialog>
    )
}
