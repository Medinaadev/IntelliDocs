import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { invitationInfoQuery } from '#/lib/queries/members'
import { api } from '#/lib/api'
import { Button } from '#/components/ui/button'
import { DatabaseZap, Loader2, MailCheck, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWorkspacesStore } from '#/stores/workspacesStore'
import { useAuthStore } from '#/stores/authStore'

export const Route = createFileRoute('/invitations/$token/')({
    component: RouteComponent,
    head: () => ({ title: 'Invitación — IntelliDocs' }),
})

function RouteComponent() {
    const { token } = Route.useParams()
    const navigate = useNavigate()
    const fetchWorkspaces = useWorkspacesStore((s) => s.fetchWorkspaces)
    const session = useAuthStore((s) => s.session)

    const { data, isLoading, error } = useQuery(invitationInfoQuery(token))

    const acceptMutation = useMutation({
        mutationFn: () => api.post<{ workspaceId: string }>(`/invitations/${token}/accept`, {}),
        onSuccess: async ({ workspaceId }) => {
            // Refrescar la lista de workspaces para que el nuevo aparezca en el sidebar
            await fetchWorkspaces()
            toast.success(`¡Bienvenido al workspace!`)
            navigate({ to: '/dashboard/$workspaceId', params: { workspaceId } })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (isLoading) {
        return (
            <main className="flex flex-1 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </main>
        )
    }

    if (error || !data) {
        return (
            <main className="flex flex-1 items-center justify-center p-4">
                <div className="flex flex-col items-center gap-3 text-center max-w-sm">
                    <ShieldAlert size={36} className="text-destructive/60" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold">Invitación no válida</h1>
                    <p className="text-sm text-muted-foreground">
                        Este enlace no existe o ya no es válido.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => navigate({ to: '/' })}>
                        Ir al inicio
                    </Button>
                </div>
            </main>
        )
    }

    if (data.status === 'accepted') {
        return (
            <main className="flex flex-1 items-center justify-center p-4">
                <div className="flex flex-col items-center gap-3 text-center max-w-sm">
                    <CheckCircle2 size={36} className="text-green-500/70" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold">Invitación ya aceptada</h1>
                    <p className="text-sm text-muted-foreground">
                        Ya eres miembro de <strong>{data.workspaceName}</strong>.
                    </p>
                    <Button size="sm" onClick={() => navigate({ to: '/dashboard/$workspaceId', params: { workspaceId: data.workspaceId } })}>
                        Abrir workspace
                    </Button>
                </div>
            </main>
        )
    }

    if (data.status === 'cancelled' || data.expired) {
        return (
            <main className="flex flex-1 items-center justify-center p-4">
                <div className="flex flex-col items-center gap-3 text-center max-w-sm">
                    <ShieldAlert size={36} className="text-amber-500/60" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold">Invitación expirada</h1>
                    <p className="text-sm text-muted-foreground">
                        Este enlace ha expirado o fue cancelado. Pide al propietario
                        que te envíe una nueva invitación.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => navigate({ to: '/' })}>
                        Ir al inicio
                    </Button>
                </div>
            </main>
        )
    }

    return (
        <main className="flex flex-1 items-center justify-center p-4">
            <div className="w-full max-w-sm flex flex-col items-center gap-6">
                {/* logotipo */}
                <div className="flex items-center gap-2">
                    <DatabaseZap size={22} />
                    <span className="text-lg font-bold tracking-tight">IntelliDocs</span>
                </div>

                {/* tarjeta */}
                <div className="w-full rounded-2xl border border-black/8 dark:border-white/8 bg-white dark:bg-white/3 shadow-sm p-6 flex flex-col items-center gap-5 text-center">
                    {data.workspaceImage ? (
                        <img
                            src={data.workspaceImage}
                            alt={data.workspaceName}
                            className="size-14 rounded-xl object-cover"
                        />
                    ) : (
                        <div className="size-14 rounded-xl bg-black/8 dark:bg-white/8 flex items-center justify-center">
                            <DatabaseZap size={22} className="text-muted-foreground" />
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <h1 className="text-[17px] font-semibold">{data.workspaceName}</h1>
                        <p className="text-sm text-muted-foreground">
                            <strong>{data.invitedBy}</strong> te ha invitado a colaborar
                            en este workspace.
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-black/4 dark:bg-white/6 px-3 py-1.5 rounded-full">
                        <MailCheck size={12} />
                        Invitación para <strong>{data.email}</strong>
                    </div>

                    <div className="flex flex-col gap-2 w-full">
                        <Button
                            className="w-full"
                            onClick={() => acceptMutation.mutate()}
                            disabled={!session || acceptMutation.isPending}
                        >
                            {acceptMutation.isPending
                                ? <Loader2 size={15} className="animate-spin" />
                                : <CheckCircle2 size={15} />}
                            Aceptar invitación
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/' })}>
                            Rechazar
                        </Button>
                    </div>
                </div>

                {!session && (
                    <p className="text-xs text-muted-foreground text-center">
                        Debes{' '}
                        <Link to="/auth/login" className="underline underline-offset-2">
                            iniciar sesión
                        </Link>
                        {' '}o{' '}
                        <Link to="/auth/register" className="underline underline-offset-2">
                            registrarte
                        </Link>
                        {' '}con <strong>{data.email}</strong> para aceptar.
                    </p>
                )}
            </div>
        </main>
    )
}
