import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '#/lib/api'
import { useWorkspaceStore } from '#/stores/workspaceStore'
import { useWorkspacesStore } from '#/stores/workspacesStore'
import { Check, CreditCard, ExternalLink, Loader2, Mail, Zap } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

export const Route = createFileRoute('/dashboard/$workspaceId/plans/')({
    component: PlansPage,
    head: () => ({ title: 'Planes — IntelliDocs' }),
})

type PlanTier = 'free' | 'pro' | 'enterprise' | 'custom'

type Subscription = {
    plan: PlanTier
    status: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    seatsLimit: number
    storageLimit: number
}

type PlanPrice = {
    plan: string
    priceId: string
    amount: number
    currency: string
    interval: string
}

const PLANS: {
    id: PlanTier
    name: string
    desc: string
    features: string[]
}[] = [
    {
        id: 'free',
        name: 'Gratis',
        desc: 'Para empezar sin coste.',
        features: [
            '1 GB de almacenamiento',
            'Hasta 3 miembros',
            'Búsqueda básica',
            'Procesamiento automático',
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        desc: 'Para equipos que necesitan más potencia.',
        features: [
            '100 GB de almacenamiento',
            'Hasta 25 miembros',
            'Búsqueda en contenido',
            'Procesamiento prioritario',
            'Soporte por email',
        ],
    },
    {
        id: 'enterprise',
        name: 'Empresa',
        desc: 'Para organizaciones grandes.',
        features: [
            '1 TB de almacenamiento',
            'Hasta 100 miembros',
            'Todo de Pro',
            'SLA garantizado',
            'Onboarding dedicado',
        ],
    },
    {
        id: 'custom',
        name: 'A medida',
        desc: 'Para equipos con necesidades específicas.',
        features: [
            'Todo lo de Empresa',
            'Almacenamiento a negociar',
            'Usuarios ilimitados',
            'Acuerdo de nivel de servicio',
            'Gestor de cuenta dedicado',
        ],
    },
]

function formatPrice(amount: number, currency: string) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
    }).format(amount / 100)
}

function statusLabel(status: string, cancelAtPeriodEnd: boolean) {
    if (cancelAtPeriodEnd) return 'Cancela al final del periodo'
    switch (status) {
        case 'active': return 'Activa'
        case 'past_due': return 'Pago pendiente'
        case 'canceled': return 'Cancelada'
        default: return status
    }
}

function PlansPage() {
    const { workspace } = useWorkspaceStore()
    const workspaceId = workspace?.id ?? ''
    const queryClient = useQueryClient()
    const success = new URLSearchParams(window.location.search).get('success') === '1'

    useEffect(() => {
        if (!success || !workspaceId) return

        const run = async () => {
            // sync con stripe y recarga el workspace
            try {
                await api.post(`/workspaces/${workspaceId}/subscription/sync`, {})
                await useWorkspacesStore.getState().fetchWorkspaces()
            } catch {
                // silencioso, el webhook puede haberlo hecho ya
            }

            // invalida las queries para que se refresquen
            await queryClient.invalidateQueries({ queryKey: ['subscription', workspaceId] })
            await queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })

            // limpia el ?success=1 de la url sin recargar
            window.history.replaceState({}, '', window.location.pathname)

            // nombre del plan para el toast
            const planNames: Record<string, string> = { free: 'Gratis', pro: 'Pro', enterprise: 'Empresa', business: 'Business' }
            const planKey = useWorkspacesStore.getState().workspaces.find(w => w.id === workspaceId)?.plan ?? 'pro'
            const planName = planNames[planKey] ?? planKey

            // confetti porque hay que celebrar
            const duration = 3000
            const end = Date.now() + duration
            const frame = () => {
                confetti({
                    particleCount: 6,
                    angle: 90,
                    spread: 90,
                    origin: { x: Math.random(), y: 0 },
                    gravity: 0.8,
                    drift: 0,
                })
                if (Date.now() < end) requestAnimationFrame(frame)
            }
            requestAnimationFrame(frame)
            toast.success(`¡Suscripción activada! Bienvenido al plan ${planName}.`)
        }

        run()
    }, [success, workspaceId])

    const { data: subscription, isLoading } = useQuery({
        queryKey: ['subscription', workspaceId],
        queryFn: () => api.get<Subscription>(`/workspaces/${workspaceId}/subscription`),
        enabled: !!workspaceId,
        retry: false,
    })

    const { data: prices } = useQuery({
        queryKey: ['subscription-prices', workspaceId],
        queryFn: () => api.get<PlanPrice[]>(`/workspaces/${workspaceId}/subscription/prices`),
        enabled: !!workspaceId,
        staleTime: 1000 * 60 * 60, // 1h porque los precios no cambian casi nunca
    })

    const priceFor = (planId: PlanTier) => prices?.find((p) => p.plan === planId)

    const checkoutMutation = useMutation({
        mutationFn: (plan: 'pro' | 'enterprise') =>
            api.post<{ url: string }>(`/workspaces/${workspaceId}/subscription/checkout`, {
                plan,
                successUrl: `${window.location.origin}/dashboard/${workspaceId}/plans?success=1`,
                cancelUrl: `${window.location.origin}/dashboard/${workspaceId}/plans`,
            }),
        onSuccess: (data) => {
            window.location.href = data.url
        },
        onError: () => toast.error('No se pudo iniciar el proceso de pago'),
    })

    const portalMutation = useMutation({
        mutationFn: () =>
            api.get<{ url: string }>(
                `/workspaces/${workspaceId}/subscription/billing-portal?returnUrl=${encodeURIComponent(window.location.href)}`,
            ),
        onSuccess: (data) => {
            window.location.href = data.url
        },
        onError: () => toast.error('No se pudo abrir el portal de facturación'),
    })

    const refreshAll = () => {
        queryClient.invalidateQueries({ queryKey: ['subscription', workspaceId] })
        useWorkspacesStore.getState().fetchWorkspaces()
    }

    const cancelMutation = useMutation({
        mutationFn: () =>
            api.delete(`/workspaces/${workspaceId}/subscription`),
        onSuccess: () => {
            toast.success('Suscripción cancelada al final del periodo')
            refreshAll()
        },
        onError: () => toast.error('No se pudo cancelar la suscripción'),
    })

    const reactivateMutation = useMutation({
        mutationFn: () =>
            api.post(`/workspaces/${workspaceId}/subscription/reactivate`, {}),
        onSuccess: () => {
            toast.success('Suscripción reactivada correctamente')
            refreshAll()
        },
        onError: () => toast.error('No se pudo reactivar la suscripción'),
    })

    const currentPlan: PlanTier = workspace?.plan ?? 'free'
    const hasActiveSub = subscription?.status === 'active' || subscription?.status === 'past_due'

    return (
        <div className="flex flex-col min-h-full">
            <div className="sticky top-0 z-10 backdrop-blur-sm border-b border-black/5 dark:border-white/5 px-5 py-3 flex items-center gap-2.5">
                <Zap size={15} className="text-muted-foreground" />
                <h1 className="text-[14px] font-semibold">Planes</h1>
            </div>

            <div className="flex flex-col flex-1 justify-center px-5 py-8 gap-5 max-w-7xl mx-auto w-full">

                {/* si hay sub activa la muestra aqui */}
                {isLoading && (
                    <div className="flex justify-center py-6">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {hasActiveSub && subscription && (
                    <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs p-4 flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-0.5">
                            <p className="text-[12px] text-muted-foreground/60 uppercase tracking-wide font-medium">Suscripción activa</p>
                            <p className="text-[13px] font-semibold capitalize">{subscription.plan} · {statusLabel(subscription.status, subscription.cancelAtPeriodEnd)}</p>
                            {subscription.currentPeriodEnd && (
                                <p className="text-[11px] text-muted-foreground">
                                    {subscription.cancelAtPeriodEnd ? 'Acceso hasta' : 'Siguiente cobro'}{' '}
                                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 shrink-0"
                            disabled={portalMutation.isPending}
                            onClick={() => portalMutation.mutate()}
                        >
                            {portalMutation.isPending
                                ? <Loader2 size={12} className="animate-spin" />
                                : <CreditCard size={12} />
                            }
                            Gestionar facturación
                            <ExternalLink size={11} className="text-muted-foreground" />
                        </Button>
                    </div>
                )}

                {/* cards de los planes */}
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {PLANS.map((plan) => {
                        const isCurrent = plan.id === currentPlan
                        return (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col gap-6 rounded-xl border p-7 shadow-xs ${
                                    isCurrent
                                        ? 'border-primary/30 bg-white dark:bg-white/3 ring-1 ring-primary/20'
                                        : 'border-black/6 dark:border-white/6 bg-white dark:bg-white/3'
                                }`}
                            >
                                {isCurrent && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground whitespace-nowrap">
                                        Plan actual
                                    </span>
                                )}

                                <div className="flex flex-col gap-1">
                                    <h3 className="text-[15px] font-semibold">{plan.name}</h3>
                                    <div className="flex items-end gap-1.5 mt-1">
                                        {plan.id === 'free' ? (
                                            <span className="text-[2.2rem] font-extrabold leading-none">0 €</span>
                                        ) : plan.id === 'custom' ? (
                                            <span className="text-[2.2rem] font-extrabold leading-none">A medida</span>
                                        ) : priceFor(plan.id) ? (
                                            <>
                                                <span className="text-[2.2rem] font-extrabold leading-none">
                                                    {formatPrice(priceFor(plan.id)!.amount, priceFor(plan.id)!.currency)}
                                                </span>
                                                <span className="text-[13px] text-muted-foreground mb-1">
                                                    / {priceFor(plan.id)!.interval === 'month' ? 'mes' : 'año'}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-[2.2rem] font-extrabold leading-none text-muted-foreground/30">—</span>
                                        )}
                                    </div>
                                    <p className="text-[12px] text-muted-foreground mt-0.5">{plan.desc}</p>
                                </div>

                                {/* boton de accion segun plan */}
                                {plan.id === 'free' ? (
                                    <Button variant="outline" className="w-full" disabled>
                                        {isCurrent ? 'Plan actual' : 'Cambiar a Gratis'}
                                    </Button>
                                ) : plan.id === 'custom' ? (
                                    <Button
                                        variant="outline"
                                        className="w-full gap-2"
                                        onClick={() => window.location.href = '/contact'}
                                    >
                                        <Mail size={14} />
                                        Contactar
                                    </Button>
                                ) : plan.id === 'enterprise' ? (
                                    <Button
                                        variant={isCurrent ? 'outline' : 'default'}
                                        className="w-full"
                                        disabled={isCurrent}
                                        onClick={() => !isCurrent && checkoutMutation.mutate('enterprise')}
                                    >
                                        {checkoutMutation.isPending && checkoutMutation.variables === 'enterprise'
                                            ? <Loader2 size={14} className="animate-spin" />
                                            : null}
                                        {isCurrent ? 'Plan actual' : 'Suscribirse'}
                                    </Button>
                                ) : (
                                    <Button
                                        variant={isCurrent ? 'outline' : 'default'}
                                        className="w-full"
                                        disabled={isCurrent || checkoutMutation.isPending}
                                        onClick={() => !isCurrent && checkoutMutation.mutate('pro')}
                                    >
                                        {checkoutMutation.isPending && checkoutMutation.variables === 'pro'
                                            ? <Loader2 size={14} className="animate-spin" />
                                            : null}
                                        {isCurrent ? 'Plan actual' : 'Suscribirse'}
                                    </Button>
                                )}

                                <ul className="flex flex-col gap-2.5">
                                    {plan.features.map((feat) => (
                                        <li key={feat} className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                                            <Check size={13} className="text-primary shrink-0" />
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })}
                </div>

                {/* cancelar o reactivar la sub */}
                {hasActiveSub && (
                    subscription?.cancelAtPeriodEnd ? (
                        <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs p-4 flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-0.5">
                                <p className="text-[13px] font-medium">Suscripción pendiente de cancelar</p>
                                <p className="text-[12px] text-muted-foreground">
                                    Puedes reactivarla antes de que finalice el periodo.
                                </p>
                            </div>
                            <Button
                                variant="default"
                                size="sm"
                                className="shrink-0"
                                disabled={reactivateMutation.isPending}
                                onClick={() => reactivateMutation.mutate()}
                            >
                                {reactivateMutation.isPending
                                    ? <Loader2 size={12} className="animate-spin" />
                                    : 'Reactivar'}
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs p-4 flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-0.5">
                                <p className="text-[13px] font-medium">Cancelar suscripción</p>
                                <p className="text-[12px] text-muted-foreground">
                                    Seguirás teniendo acceso hasta el final del periodo de facturación.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0 text-destructive hover:text-destructive"
                                disabled={cancelMutation.isPending}
                                onClick={() => cancelMutation.mutate()}
                            >
                                {cancelMutation.isPending
                                    ? <Loader2 size={12} className="animate-spin" />
                                    : 'Cancelar plan'}
                            </Button>
                        </div>
                    )
                )}
            </div>
        </div>
    )
}
