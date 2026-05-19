import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRealtimeChannel } from '#/lib/realtime/useRealtimeChannel'
import {
    membersQuery,
    invitationsQuery,
    type WorkspaceMember,
    type WorkspaceInvitation,
} from '#/lib/queries/members'
import { useWorkspaceStore } from '#/stores/workspaceStore'
import { api } from '#/lib/api'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
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
    Loader2,
    Mail,
    MailPlus,
    Trash2,
    UserMinus,
    Users,
    X,
    Clock,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/dashboard/$workspaceId/members/')({
    component: RouteComponent,
})

// utilidades varias

const relativeTime = (d: string) =>
    formatDistanceToNow(new Date(d), { addSuffix: true, locale: es })

const absoluteTime = (d: string) =>
    format(new Date(d), "d MMM yyyy", { locale: es })

function initials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

// dialogo de invitacion

function InviteDialog({
    open,
    onOpenChange,
    workspaceId,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    workspaceId: string
}) {
    const qc = useQueryClient()
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')

    const mutation = useMutation({
        mutationFn: (email: string) =>
            api.post(`/workspaces/${workspaceId}/members/invitations`, { email }),
        onSuccess: () => {
            toast.success('Invitación enviada')
            qc.invalidateQueries({ queryKey: ['invitations', workspaceId] })
            setEmail('')
            onOpenChange(false)
        },
        onError: (e: Error) => setError(e.message),
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        const trimmed = email.trim()
        if (!trimmed) return setError('Introduce un email')
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
            return setError('Email inválido')
        mutation.mutate(trimmed)
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!mutation.isPending) { setEmail(''); setError(''); onOpenChange(v) } }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MailPlus size={16} />
                        Invitar miembro
                    </DialogTitle>
                    <DialogDescription>
                        Se enviará un email con el enlace de invitación. Expira en 72 horas.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            Correo electrónico
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError('') }}
                            placeholder="nombre@empresa.com"
                            autoFocus
                            className="h-9 rounded-lg border border-input bg-input/30 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 transition-all placeholder:text-muted-foreground"
                        />
                        {error && <p className="text-[12px] text-destructive">{error}</p>}
                    </div>
                    <DialogFooter className="mt-1">
                        <Button type="button" variant="outline" size="sm"
                            onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                            Cancelar
                        </Button>
                        <Button type="submit" size="sm" disabled={mutation.isPending}>
                            {mutation.isPending
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Mail size={14} />}
                            Enviar invitación
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// dialogo para quitar un miembro

function RemoveMemberDialog({
    member,
    onOpenChange,
    workspaceId,
}: {
    member: WorkspaceMember | null
    onOpenChange: (v: boolean) => void
    workspaceId: string
}) {
    const qc = useQueryClient()
    const mutation = useMutation({
        mutationFn: () =>
            api.delete(`/workspaces/${workspaceId}/members/${member!.user.id}`),
        onSuccess: () => {
            toast.success(`${member!.user.name} eliminado del workspace`)
            qc.invalidateQueries({ queryKey: ['members', workspaceId] })
            qc.invalidateQueries({ queryKey: ['overview', workspaceId] })
            onOpenChange(false)
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (!member) return null
    return (
        <Dialog open onOpenChange={(v) => !mutation.isPending && onOpenChange(v)}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserMinus size={16} className="text-destructive" />
                        Eliminar miembro
                    </DialogTitle>
                    <DialogDescription>
                        ¿Eliminar a{' '}
                        <span className="font-medium text-foreground">{member.user.name}</span>{' '}
                        del workspace? Perderá acceso inmediatamente.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" size="sm"
                        onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" size="sm"
                        onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                        {mutation.isPending
                            ? <Loader2 size={14} className="animate-spin" />
                            : <UserMinus size={14} />}
                        Eliminar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// fila de cada miembro

function MemberRow({
    member,
    isCurrentUser,
    isOwner,
    onRemove,
}: {
    member: WorkspaceMember
    isCurrentUser: boolean
    isOwner: boolean
    onRemove: (m: WorkspaceMember) => void
}) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl group hover:bg-black/4 dark:hover:bg-white/4 transition-colors">
            <Avatar className="shrink-0 size-8">
                {member.user.image && <AvatarImage src={member.user.image} />}
                <AvatarFallback className="text-xs">{initials(member.user.name)}</AvatarFallback>
            </Avatar>

            <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium truncate">{member.user.name}</span>
                    {member.isOwner && (
                        <Crown size={11} className="text-amber-500 shrink-0" title="Propietario" />
                    )}
                    {isCurrentUser && (
                        <span className="text-[10px] text-muted-foreground shrink-0">(tú)</span>
                    )}
                </div>
                <span className="text-xs text-muted-foreground truncate">{member.user.email}</span>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
                <span className="text-[11px] text-muted-foreground/60">
                    Activo {relativeTime(member.lastActiveAt)}
                </span>
                <span className="text-[11px] text-muted-foreground/40">
                    desde {absoluteTime(member.joinedAt)}
                </span>
            </div>

            {isOwner && !member.isOwner && !isCurrentUser && (
                <button
                    onClick={() => onRemove(member)}
                    title="Eliminar miembro"
                    className="ml-2 size-7 flex items-center justify-center rounded-md text-muted-foreground/25 hover:text-destructive hover:bg-destructive/8 transition-colors"
                >
                    <Trash2 size={13} />
                </button>
            )}
        </div>
    )
}

// fila de invitacion pendiente

function InvitationRow({
    inv,
    workspaceId,
}: {
    inv: WorkspaceInvitation
    workspaceId: string
}) {
    const qc = useQueryClient()
    const isExpired = new Date(inv.expiresAt) < new Date()

    const cancelMutation = useMutation({
        mutationFn: () =>
            api.delete(
                `/workspaces/${workspaceId}/members/invitations/${inv.id}`,
            ),
        onSuccess: () => {
            toast.success('Invitación cancelada')
            qc.invalidateQueries({ queryKey: ['invitations', workspaceId] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl group hover:bg-black/4 dark:hover:bg-white/4 transition-colors">
            <div className="size-8 rounded-full bg-black/6 dark:bg-white/8 flex items-center justify-center shrink-0">
                <Mail size={14} className="text-muted-foreground" />
            </div>

            <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-medium truncate">{inv.email}</span>
                <span className="text-xs text-muted-foreground">
                    Invitado por {inv.invitedBy.name}
                </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                    'hidden sm:flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full',
                    isExpired
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                )}>
                    <Clock size={10} />
                    {isExpired ? 'Expirada' : `Expira ${relativeTime(inv.expiresAt)}`}
                </span>
                <button
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    title="Cancelar invitación"
                    className="size-7 flex items-center justify-center rounded-md text-muted-foreground/25 hover:text-destructive hover:bg-destructive/8 transition-colors disabled:opacity-50"
                >
                    {cancelMutation.isPending
                        ? <Loader2 size={13} className="animate-spin" />
                        : <X size={13} />}
                </button>
            </div>
        </div>
    )
}

// pagina principal

function RouteComponent() {
    const { workspaceId } = Route.useParams()
    const workspace = useWorkspaceStore((s) => s.workspace)
    const currentUserId = useWorkspaceStore((s) => s.workspace?.id) // temporal, hay que sacar el userId del store de auth
    const qc = useQueryClient()

    useRealtimeChannel({
        channel: 'Members',
        filters: { workspaceId },
        onEvent: () => {
            qc.invalidateQueries({ queryKey: ['members', workspaceId] })
            qc.invalidateQueries({ queryKey: ['invitations', workspaceId] })
        },
    })

    const { data: members, isLoading: loadingMembers } = useQuery(membersQuery(workspaceId))
    const { data: invitations, isLoading: loadingInvites } = useQuery(invitationsQuery(workspaceId))

    const [inviteOpen, setInviteOpen] = useState(false)
    const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null)

    const me = members?.find((m) => m.isOwner === true) // proxy temporal hasta tener el userId del auth store
    const iAmOwner = members?.some((m) => m.isOwner) ?? false

    return (
        <div className="flex flex-col min-h-full">
            {/* cabecera */}
            <div className="sticky top-0 z-10 backdrop-blur-sm border-b border-black/5 dark:border-white/5 px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <Users size={16} className="text-muted-foreground" />
                    <h1 className="text-[14px] font-semibold">Miembros</h1>
                    {members && (
                        <span className="text-[12px] text-muted-foreground tabular-nums">
                            {members.length} / {workspace?.seatsLimit ?? '—'}
                        </span>
                    )}
                </div>
                <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5">
                    <MailPlus size={14} />
                    <span className="hidden sm:inline">Invitar</span>
                </Button>
            </div>

            <div className="flex flex-col gap-6 px-5 py-5">
                {/* lista de miembros */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground/60 px-1">
                        Miembros activos
                    </h2>
                    <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 overflow-hidden shadow-xs">
                        {loadingMembers ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : !members?.length ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground/50">
                                <Users size={28} strokeWidth={1.5} />
                                <p className="text-sm">Sin miembros</p>
                            </div>
                        ) : (
                            <div className="flex flex-col p-1.5 gap-0.5">
                                {members.map((m) => (
                                    <MemberRow
                                        key={m.id}
                                        member={m}
                                        isCurrentUser={false}
                                        isOwner={iAmOwner}
                                        onRemove={setRemoveTarget}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* invitaciones que aun no han aceptado */}
                <section className="flex flex-col gap-2">
                    <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground/60 px-1">
                        Invitaciones pendientes
                        {invitations?.length ? (
                            <span className="ml-1.5 normal-case font-normal text-muted-foreground/40">
                                {invitations.length}
                            </span>
                        ) : null}
                    </h2>
                    <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 overflow-hidden shadow-xs">
                        {loadingInvites ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : !invitations?.length ? (
                            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground/40">
                                <Mail size={16} strokeWidth={1.5} />
                                <p className="text-sm">No hay invitaciones pendientes</p>
                            </div>
                        ) : (
                            <div className="flex flex-col p-1.5 gap-0.5">
                                {invitations.map((inv) => (
                                    <InvitationRow
                                        key={inv.id}
                                        inv={inv}
                                        workspaceId={workspaceId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <InviteDialog
                open={inviteOpen}
                onOpenChange={setInviteOpen}
                workspaceId={workspaceId}
            />

            {removeTarget && (
                <RemoveMemberDialog
                    member={removeTarget}
                    onOpenChange={(v) => !v && setRemoveTarget(null)}
                    workspaceId={workspaceId}
                />
            )}
        </div>
    )
}
