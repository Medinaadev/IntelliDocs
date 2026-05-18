import { useQuery } from '@tanstack/react-query'
import { api } from '#/lib/api'
import type { DriveFileItem } from '@intellidocs/types'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Download, Loader2, FileX, FileText, Music } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: DriveFileItem
    workspaceId: string
}

type DownloadUrlResponse = {
    url: string
    filename: string
    mimeType: string | null
}

type PreviewKind = 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'none'

function getPreviewKind(mimeType: string | null): PreviewKind {
    if (!mimeType) return 'none'
    if (mimeType === 'application/pdf') return 'pdf'
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (
        mimeType.startsWith('text/') ||
        mimeType === 'application/json' ||
        mimeType === 'application/xml' ||
        mimeType === 'application/javascript' ||
        mimeType === 'application/typescript'
    )
        return 'text'
    return 'none'
}

// clases del dialog segun el tipo, hay que pisar el max-w que inyecta DialogContent
function dialogSizeClass(kind: PreviewKind) {
    switch (kind) {
        case 'pdf':
            return 'max-w-[95vw] sm:max-w-[95vw] w-[95vw] h-[95vh] flex flex-col gap-0 p-0'
        case 'image':
            return 'max-w-[92vw] sm:max-w-[92vw] w-[92vw] h-[90vh] flex flex-col gap-0 p-0'
        case 'video':
            return 'max-w-[92vw] sm:max-w-4xl w-[92vw] flex flex-col gap-0 p-0'
        case 'audio':
            return 'max-w-sm sm:max-w-sm w-full flex flex-col gap-0 p-0'
        case 'text':
            return 'max-w-[90vw] sm:max-w-3xl w-[90vw] h-[78vh] flex flex-col gap-0 p-0'
        case 'none':
            return 'max-w-xs sm:max-w-xs w-full flex flex-col gap-0 p-0'
    }
}

// preview de texto/codigo

function TextPreview({ url }: { url: string }) {
    const [text, setText] = useState<string | null>(null)
    const [error, setError] = useState(false)

    useEffect(() => {
        let cancelled = false
        fetch(url)
            .then((r) => r.text())
            .then((t) => {
                if (!cancelled) setText(t)
            })
            .catch(() => {
                if (!cancelled) setError(true)
            })
        return () => {
            cancelled = true
        }
    }, [url])

    if (error)
        return (
            <div className="flex flex-1 items-center justify-center text-muted-foreground/50">
                <FileX size={28} strokeWidth={1.5} />
            </div>
        )

    if (text === null)
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
        )

    return (
        <div className="flex-1 min-h-0 overflow-auto bg-muted/30">
            <pre className="p-4 text-[12.5px] leading-relaxed font-mono text-foreground whitespace-pre-wrap break-words">
                {text}
            </pre>
        </div>
    )
}

// componente principal

export function DrivePreviewDialog({
    open,
    onOpenChange,
    item,
    workspaceId,
}: Props) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['file-download-url', workspaceId, item.id],
        queryFn: () =>
            api.get<DownloadUrlResponse>(
                `/workspaces/${workspaceId}/drive/files/${item.id}/download`,
            ),
        enabled: open,
        staleTime: 1000 * 60 * 5,
    })

    // usa el mimeType del item para el tamano mientras carga, luego el de la api
    const mimeType = data?.mimeType ?? item.mimeType ?? null
    const kind = getPreviewKind(mimeType)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={dialogSizeClass(kind)} >
                <DialogHeader className="flex-row items-center gap-3 px-4 py-3 border-b shrink-0">
                    {data?.url && (
                        <a
                            href={data.url}
                            download={item.name}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 shrink-0"
                            >
                                <Download size={13} />
                                Descargar
                            </Button>
                        </a>
                    )}
                    <DialogTitle className="text-[13px] font-semibold truncate">
                        {item.name}
                    </DialogTitle>
                </DialogHeader>

                {/* cargando */}
                {isLoading && (
                    <div className="flex flex-1 min-h-[120px] items-center justify-center">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* error al cargar */}
                {isError && (
                    <div className="flex flex-1 min-h-[120px] flex-col items-center justify-center gap-2 text-muted-foreground/50">
                        <FileX size={30} strokeWidth={1.5} />
                        <p className="text-sm">No se pudo cargar el archivo</p>
                    </div>
                )}

                {/* pdf en iframe */}
                {data && kind === 'pdf' && (
                    <iframe
                        src={data.url}
                        title={item.name}
                        className="flex-1 min-h-0 w-full border-0"
                    />
                )}

                {/* imagen */}
                {data && kind === 'image' && (
                    <div className="flex-1 min-h-0 flex items-center justify-center p-4 bg-black/3 dark:bg-white/3">
                        <img
                            src={data.url}
                            alt={item.name}
                            className="max-w-full max-h-full object-contain rounded"
                        />
                    </div>
                )}

                {/* video */}
                {data && kind === 'video' && (
                    <div className="flex items-center justify-center bg-black p-0">
                        <video
                            src={data.url}
                            controls
                            autoPlay={false}
                            className="max-w-full max-h-[70vh] w-full"
                        >
                            Tu navegador no soporta la reproducción de vídeo.
                        </video>
                    </div>
                )}

                {/* audio */}
                {data && kind === 'audio' && (
                    <div className="flex flex-col items-center gap-4 px-6 py-8">
                        <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                            <Music size={28} className="text-muted-foreground" />
                        </div>
                        <p className="text-[13px] font-medium text-center truncate max-w-full">
                            {item.name}
                        </p>
                        <audio
                            src={data.url}
                            controls
                            className="w-full"
                        >
                            Tu navegador no soporta la reproducción de audio.
                        </audio>
                    </div>
                )}

                {/* texto o codigo */}
                {data && kind === 'text' && (
                    <>
                        <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0 bg-muted/40">
                            <FileText size={13} className="text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground font-mono">
                                {mimeType}
                            </span>
                        </div>
                        <TextPreview url={data.url} />
                    </>
                )}

                {/* sin preview, solo boton de descarga */}
                {data && kind === 'none' && (
                    <div className="flex flex-col items-center gap-3 px-6 py-8 text-muted-foreground/50">
                        <FileX size={32} strokeWidth={1.5} />
                        <p className="text-[13px] text-center">
                            Vista previa no disponible
                        </p>
                        <a
                            href={data.url}
                            download={item.name}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                            >
                                <Download size={13} />
                                Descargar archivo
                            </Button>
                        </a>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
