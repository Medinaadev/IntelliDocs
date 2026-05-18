import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceStore } from '#/stores/workspaceStore'
import { useWorkspacesStore } from '#/stores/workspacesStore'
import { useAuthStore } from '#/stores/authStore'
import { membersQuery } from '#/lib/queries/members'
import { api } from '#/lib/api'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import {
    Crown,
    DatabaseZap,
    ImageUp,
    Loader2,
    LogOut,
    Pencil,
    Settings,
    Trash2,
    Users,
    HardDrive,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { formatFileSize, FILE_LIMITS } from '#/lib/file-size'

export const Route = createFileRoute('/dashboard/$workspaceId/settings/')({
    component: RouteComponent,
})

// badge del plan

function PlanBadge({ plan }: { plan: string }) {
    if (plan === 'pro')
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Crown size={10} />
                Pro
            </span>
        )
    if (plan === 'enterprise')
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Enterprise
            </span>
        )
    return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/6 dark:bg-white/8 text-muted-foreground border border-black/8 dark:border-white/10">
            Free
        </span>
    )
}

// dialogo para borrar el workspace, pide confirmacion

function DeleteDialog({
    workspaceName,
    onConfirm,
    onClose,
    isPending,
}: {
    workspaceName: string
    onConfirm: () => void
    onClose: () => void
    isPending: boolean
}) {
    const [input, setInput] = useState('')
    const match = input === workspaceName

    return (
        <Dialog open onOpenChange={(v) => !isPending && !v && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader className="border-b border-black/10 dark:border-white/10 pb-3">
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 size={15} />
                        Eliminar workspace
                    </DialogTitle>
                    <DialogDescription>
                        Esta acción es <strong>irreversible</strong>. Se
                        eliminarán todos los archivos, carpetas y miembros.
                        Escribe{' '}
                        <strong className="text-foreground">
                            {workspaceName}
                        </strong>{' '}
                        para confirmar.
                    </DialogDescription>
                </DialogHeader>
                <Input
                    placeholder={workspaceName}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    autoFocus
                />
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isPending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={!match || isPending}
                        onClick={onConfirm}
                    >
                        {isPending
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={13} />}
                        Eliminar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// dialogo para abandonar el workspace

function LeaveDialog({
    workspaceName,
    onConfirm,
    onClose,
    isPending,
}: {
    workspaceName: string
    onConfirm: () => void
    onClose: () => void
    isPending: boolean
}) {
    return (
        <Dialog open onOpenChange={(v) => !isPending && !v && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader className="border-b border-black/10 dark:border-white/10 pb-3">
                    <DialogTitle className="flex items-center gap-2">
                        <LogOut size={15} />
                        Abandonar workspace
                    </DialogTitle>
                    <DialogDescription>
                        Perderás el acceso a{' '}
                        <strong>{workspaceName}</strong> inmediatamente. Podrás
                        volver si alguien te invita de nuevo.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isPending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isPending}
                    >
                        {isPending
                            ? <Loader2 size={13} className="animate-spin" />
                            : <LogOut size={13} />}
                        Abandonar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// pagina de configuracion del workspace

function RouteComponent() {
    const { workspaceId } = Route.useParams()
    const navigate = useNavigate()
    const qc = useQueryClient()
    const workspace = useWorkspaceStore((s) => s.workspace)
    const fetchWorkspaces = useWorkspacesStore((s) => s.fetchWorkspaces)
    const currentUserId = useAuthStore((s) => s.session?.user.id)

    const { data: members } = useQuery(membersQuery(workspaceId))
    const me = members?.find((m) => m.user.id === currentUserId)
    const isOwner = me?.isOwner ?? false

    const [name, setName] = useState(workspace?.name ?? '')
    useEffect(() => {
        if (workspace?.name) setName(workspace.name)
    }, [workspace?.name])

    const [showDelete, setShowDelete] = useState(false)
    const [showLeave, setShowLeave] = useState(false)
    const imageInputRef = useRef<HTMLInputElement>(null)

    const renameMutation = useMutation({
        mutationFn: (newName: string) =>
            api.patch(`/workspaces/${workspaceId}/name`, { name: newName }),
        onSuccess: () => {
            toast.success('Nombre actualizado')
            qc.invalidateQueries({ queryKey: ['overview', workspaceId] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const imageMutation = useMutation({
        mutationFn: (file: File) => {
            const formData = new FormData()
            formData.append('image', file)
            return api.patch(`/workspaces/${workspaceId}/image`, formData)
        },
        onSuccess: async () => {
            toast.success('Imagen actualizada')
            await fetchWorkspaces()
            qc.invalidateQueries({ queryKey: ['overview', workspaceId] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const deleteMutation = useMutation({
        mutationFn: () => api.delete(`/workspaces/${workspaceId}`),
        onSuccess: async () => {
            await fetchWorkspaces()
            toast.success('Workspace eliminado')
            navigate({ to: '/' })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const leaveMutation = useMutation({
        mutationFn: () => api.post(`/workspaces/${workspaceId}/leave`, {}),
        onSuccess: async () => {
            await fetchWorkspaces()
            toast.success('Has abandonado el workspace')
            navigate({ to: '/' })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('El archivo debe ser una imagen')
            return
        }
        if (file.size > FILE_LIMITS.WORKSPACE_IMAGE) {
            toast.error(`Máximo ${formatFileSize(FILE_LIMITS.WORKSPACE_IMAGE)}`)
            return
        }
        imageMutation.mutate(file)
    }

    const seatsUsed = members?.length ?? 0
    const seatsTotal = workspace?.seatsLimit ?? null

    return (
        <div className="flex flex-col min-h-full">
            {/* cabecera */}
            <div className="sticky top-0 z-10 backdrop-blur-sm border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center gap-2.5">
                <Settings size={15} className="text-muted-foreground" />
                <h1 className="text-[14px] font-semibold">Configuración</h1>
            </div>

            <div className="flex flex-col gap-6 px-4 py-5 max-w-xl w-full mx-auto">

                {/* seccion general */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-1">
                        General
                    </h2>
                    <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs divide-y divide-black/5 dark:divide-white/5 overflow-hidden">

                        {/* imagen del workspace */}
                        <div className="flex items-center gap-4 px-4 py-4">
                            <div className="relative shrink-0">
                                {workspace?.image ? (
                                    <img
                                        src={workspace.image}
                                        alt={workspace.name}
                                        className="size-14 rounded-xl object-cover"
                                    />
                                ) : (
                                    <div className="size-14 rounded-xl bg-black/6 dark:bg-white/6 flex items-center justify-center">
                                        <DatabaseZap size={20} className="text-muted-foreground/50" />
                                    </div>
                                )}
                                {imageMutation.isPending && (
                                    <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
                                        <Loader2 size={16} className="animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <span className="text-[13px] font-medium">Imagen del workspace</span>
                                <span className="text-[12px] text-muted-foreground/60">
                                    PNG, JPG o WEBP · máx. {formatFileSize(FILE_LIMITS.WORKSPACE_IMAGE)}
                                </span>
                            </div>
                            {isOwner && (
                                <>
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => imageInputRef.current?.click()}
                                        disabled={imageMutation.isPending}
                                        className="shrink-0"
                                    >
                                        <ImageUp size={13} />
                                        Cambiar
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* nombre del workspace */}
                        <div className="flex flex-col gap-2 px-4 py-4">
                            <span className="text-[12px] font-medium text-muted-foreground/70">
                                Nombre del workspace
                            </span>
                            {isOwner ? (
                                <div className="flex gap-2">
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        maxLength={80}
                                        placeholder="Nombre del workspace"
                                        className="flex-1"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => renameMutation.mutate(name)}
                                        disabled={
                                            renameMutation.isPending ||
                                            name.trim() === workspace?.name ||
                                            name.trim().length < 2
                                        }
                                    >
                                        {renameMutation.isPending
                                            ? <Loader2 size={13} className="animate-spin" />
                                            : <Pencil size={13} />}
                                        Guardar
                                    </Button>
                                </div>
                            ) : (
                                <span className="text-[13px]">{workspace?.name}</span>
                            )}
                        </div>
                    </div>
                </section>

                {/* info del plan */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-1">
                        Plan
                    </h2>
                    <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs divide-y divide-black/5 dark:divide-white/5 overflow-hidden">

                        {/* fila con el plan actual */}
                        <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Crown size={13} className="text-muted-foreground/50" />
                                <span className="text-[13px] text-muted-foreground">Plan actual</span>
                            </div>
                            {workspace?.plan
                                ? <PlanBadge plan={workspace.plan} />
                                : <span className="text-[13px] font-medium text-muted-foreground">—</span>
                            }
                        </div>

                        {/* plazas usadas vs limite */}
                        <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Users size={13} className="text-muted-foreground/50" />
                                <span className="text-[13px] text-muted-foreground">Miembros</span>
                            </div>
                            <span className="text-[13px] font-medium tabular-nums">
                                {seatsTotal
                                    ? <>{seatsUsed} <span className="text-muted-foreground/50 font-normal">/ {seatsTotal}</span></>
                                    : seatsUsed
                                }
                            </span>
                        </div>

                        {/* limite de almacenamiento */}
                        <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                                <HardDrive size={13} className="text-muted-foreground/50" />
                                <span className="text-[13px] text-muted-foreground">Almacenamiento</span>
                            </div>
                            <span className="text-[13px] font-medium">
                                {workspace?.storageLimit != null
                                    ? `${workspace.storageLimit} GB`
                                    : '—'}
                            </span>
                        </div>
                    </div>
                </section>

                {/* zona peligrosa, acciones destructivas */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-red-500/60 px-1">
                        Zona de peligro
                    </h2>
                    <div className="rounded-xl border border-red-500/20 bg-white dark:bg-white/3 shadow-xs divide-y divide-red-500/10 overflow-hidden">
                        {!isOwner && (
                            <div className="flex items-center justify-between px-4 py-4">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[13px] font-medium">Abandonar workspace</span>
                                    <span className="text-[12px] text-muted-foreground/60">
                                        Perderás el acceso inmediatamente.
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive border-destructive/30 hover:bg-destructive/8 hover:text-destructive shrink-0"
                                    onClick={() => setShowLeave(true)}
                                >
                                    <LogOut size={13} />
                                    Abandonar
                                </Button>
                            </div>
                        )}
                        {isOwner && (
                            <div className="flex items-center justify-between px-4 py-4">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[13px] font-medium">Eliminar workspace</span>
                                    <span className="text-[12px] text-muted-foreground/60">
                                        Acción irreversible. Se borrarán todos los datos.
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive border-destructive/30 hover:bg-destructive/8 hover:text-destructive shrink-0"
                                    onClick={() => setShowDelete(true)}
                                >
                                    <Trash2 size={13} />
                                    Eliminar
                                </Button>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* dialogos de eliminar/abandonar */}
            {showDelete && workspace && (
                <DeleteDialog
                    workspaceName={workspace.name}
                    onConfirm={() => deleteMutation.mutate()}
                    onClose={() => setShowDelete(false)}
                    isPending={deleteMutation.isPending}
                />
            )}
            {showLeave && workspace && (
                <LeaveDialog
                    workspaceName={workspace.name}
                    onConfirm={() => leaveMutation.mutate()}
                    onClose={() => setShowLeave(false)}
                    isPending={leaveMutation.isPending}
                />
            )}
        </div>
    )
}
