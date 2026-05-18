import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '#/stores/authStore'
import { useHeaderStore } from '#/stores/headerStore'
import { useQuery } from '@tanstack/react-query'
import { api } from '#/lib/api'
import { motion } from 'framer-motion'
import {
    Search,
    FolderOpen,
    Zap,
    Users,
    ShieldCheck,
    Activity,
    ArrowRight,
    Check,
    FileText,
    Brain,
    Lock,
    ChevronDown,
    Mail,
} from 'lucide-react'
import { Button } from '#/components/ui/button'

type PlanPrice = {
    plan: string
    priceId: string
    amount: number
    currency: string
    interval: string
}

function formatPrice(amount: number, currency: string) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
    }).format(amount / 100)
}

export const Route = createFileRoute('/')({ component: LandingPage })

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
    }),
}

const FEATURES = [
    {
        icon: FolderOpen,
        title: 'Drive inteligente',
        desc: 'Organiza carpetas y archivos con una interfaz limpia. Arrastra, renombra y gestiona desde cualquier dispositivo.',
    },
    {
        icon: Brain,
        title: 'Procesamiento automático',
        desc: 'Extrae texto de PDFs, dimensiones de imágenes y checksums SHA-256 en segundo plano nada más subir un archivo.',
    },
    {
        icon: Search,
        title: 'Búsqueda en contenido',
        desc: 'Busca dentro del texto de tus documentos, no solo por nombre. Resultados instantáneos con texto completo.',
    },
    {
        icon: Users,
        title: 'Trabajo en equipo',
        desc: 'Invita miembros, gestiona roles y colabora en un espacio compartido con historial de actividad completo.',
    },
    {
        icon: Activity,
        title: 'Registro de actividad',
        desc: 'Cada acción queda registrada — quién subió, renombró o eliminó cada archivo y cuándo.',
    },
    {
        icon: ShieldCheck,
        title: 'Seguridad ante todo',
        desc: 'Almacenamiento cifrado, URLs prefirmadas con caducidad y autenticación JWT con refresh tokens.',
    },
]

const PLANS = [
    {
        id: 'free',
        name: 'Gratis',
        desc: 'Para empezar sin coste.',
        features: ['1 GB de almacenamiento', 'Hasta 3 miembros', 'Búsqueda básica', 'Procesamiento automático'],
        highlight: false,
    },
    {
        id: 'pro',
        name: 'Pro',
        desc: 'Para equipos que necesitan más potencia.',
        features: ['100 GB de almacenamiento', 'Hasta 25 miembros', 'Búsqueda en contenido', 'Procesamiento prioritario', 'Soporte por email'],
        highlight: true,
    },
    {
        id: 'enterprise',
        name: 'Empresa',
        desc: 'Para organizaciones grandes.',
        features: ['1 TB de almacenamiento', 'Hasta 100 miembros', 'Todo de Pro', 'SLA garantizado', 'Onboarding dedicado'],
        highlight: false,
    },
    {
        id: 'custom',
        name: 'A medida',
        desc: 'Para equipos con necesidades específicas.',
        features: ['Todo lo de Empresa', 'Almacenamiento a negociar', 'Usuarios ilimitados', 'Acuerdo de nivel de servicio', 'Gestor de cuenta dedicado'],
        highlight: false,
    },
]

const STEPS = [
    { num: '01', title: 'Crea tu workspace', desc: 'Regístrate y ten tu espacio listo en menos de un minuto.' },
    { num: '02', title: 'Sube tus documentos', desc: 'Arrastra archivos o carpetas. Los procesamos automáticamente.' },
    { num: '03', title: 'Busca y colabora', desc: 'Encuentra cualquier documento por contenido e invita a tu equipo.' },
]

function LandingPage() {
    const { session } = useAuthStore()
    const navigate = useNavigate()
    const { setFixed } = useHeaderStore()

    const { data: prices } = useQuery({
        queryKey: ['public-prices'],
        queryFn: () => api.get<PlanPrice[]>('/stripe/prices'),
        staleTime: 1000 * 60 * 60,
    })

    const priceFor = (planId: string) => prices?.find((p) => p.plan === planId)

    useEffect(() => {
        setFixed(true)
        return () => setFixed(false)
    }, [setFixed])

    function handleCta() {
        if (session) {
            void navigate({ to: '/workspaces' })
        } else {
            void navigate({ to: '/auth/register' })
        }
    }

    return (
        <div className="flex flex-col">

            {/* Hero */}
            <section className="relative flex flex-col items-center justify-center text-center px-4 min-h-screen overflow-hidden">
                <motion.div
                    initial="hidden"
                    animate="show"
                    className="flex flex-col items-center gap-5 max-w-3xl mx-auto"
                >
                    <motion.span
                        variants={fadeUp}
                        custom={0}
                        className="inline-flex items-center gap-1.5 rounded-full border border-black/8 dark:border-white/8 bg-black/4 dark:bg-white/4 px-3 py-1 text-[12px] font-medium text-muted-foreground"
                    >
                        <Zap size={11} />
                        Procesamiento inteligente de documentos
                    </motion.span>

                    <motion.h1
                        variants={fadeUp}
                        custom={1}
                        className="text-[clamp(2.2rem,6vw,3.6rem)] font-extrabold leading-[1.1] tracking-tight"
                    >
                        Tu equipo. Tus documentos. Sin caos.
                    </motion.h1>

                    <motion.p
                        variants={fadeUp}
                        custom={2}
                        className="text-[15px] text-muted-foreground max-w-xl leading-relaxed"
                    >
                        IntelliDocs extrae, indexa y hace buscable todo el contenido
                        de tus archivos de forma automática.
                    </motion.p>

                    <motion.div
                        variants={fadeUp}
                        custom={3}
                        className="flex flex-wrap justify-center gap-2.5"
                    >
                        <Button size="lg" className="gap-2 px-6" onClick={handleCta}>
                            {session ? 'Ir al dashboard' : 'Empezar gratis'}
                            <ArrowRight size={14} />
                        </Button>
                        {!session && (
                            <Button
                                size="lg"
                                variant="outline"
                                className="px-6"
                                onClick={() => void navigate({ to: '/auth/login' })}
                            >
                                Iniciar sesión
                            </Button>
                        )}
                    </motion.div>

                    {!session && (
                        <motion.p
                            variants={fadeUp}
                            custom={4}
                            className="text-[12px] text-muted-foreground/50"
                        >
                            Sin tarjeta de crédito · Gratis para siempre en el plan básico
                        </motion.p>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2"
                >
                    <motion.div
                        animate={{ y: [0, 6, 0] }}
                        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                    >
                        <ChevronDown size={20} className="text-muted-foreground/40" />
                    </motion.div>
                </motion.div>
            </section>

            {/* Features */}
            <section className="py-20 px-4 border-t border-black/5 dark:border-white/5">
                <div className="max-w-5xl mx-auto flex flex-col gap-12">
                    <div className="text-center flex flex-col gap-2">
                        <h2 className="text-[22px] font-bold tracking-tight">
                            Todo lo que necesitas, nada de lo que no
                        </h2>
                        <p className="text-[13px] text-muted-foreground">
                            Diseñado para equipos que no quieren perder tiempo buscando documentos.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={f.title}
                                initial="hidden"
                                whileInView="show"
                                viewport={{ once: true, margin: '-50px' }}
                                variants={fadeUp}
                                custom={i * 0.4}
                                className="flex flex-col gap-3 rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 p-4 shadow-xs"
                            >
                                <div className="size-8 rounded-lg bg-black/4 dark:bg-white/6 flex items-center justify-center">
                                    <f.icon size={15} className="text-foreground/70" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-[13px] font-semibold">{f.title}</h3>
                                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                                        {f.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Cómo funciona */}
            <section className="py-20 px-4 border-t border-black/5 dark:border-white/5">
                <div className="max-w-4xl mx-auto flex flex-col gap-12">
                    <div className="text-center flex flex-col gap-2">
                        <h2 className="text-[22px] font-bold tracking-tight">
                            En marcha en 3 pasos
                        </h2>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3">
                        {STEPS.map((s, i) => (
                            <motion.div
                                key={s.num}
                                initial="hidden"
                                whileInView="show"
                                viewport={{ once: true, margin: '-50px' }}
                                variants={fadeUp}
                                custom={i * 0.4}
                                className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 p-5 shadow-xs flex flex-col gap-2"
                            >
                                <span className="text-[2rem] font-black text-black/8 dark:text-white/10 leading-none">
                                    {s.num}
                                </span>
                                <h3 className="text-[13px] font-semibold">{s.title}</h3>
                                <p className="text-[12px] text-muted-foreground leading-relaxed">
                                    {s.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="py-20 px-4 border-t border-black/5 dark:border-white/5">
                <div className="max-w-6xl mx-auto flex flex-col gap-12">
                    <div className="text-center flex flex-col gap-2">
                        <h2 className="text-[22px] font-bold tracking-tight">
                            Precios transparentes
                        </h2>
                        <p className="text-[13px] text-muted-foreground">
                            Escala según tus necesidades. Sin sorpresas.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                        {PLANS.map((p, i) => (
                            <motion.div
                                key={p.name}
                                initial="hidden"
                                whileInView="show"
                                viewport={{ once: true, margin: '-50px' }}
                                variants={fadeUp}
                                custom={i * 0.4}
                                className={`relative flex flex-col gap-5 rounded-xl border p-6 shadow-xs ${
                                    p.highlight
                                        ? 'border-primary/30 bg-white dark:bg-white/3 ring-1 ring-primary/20'
                                        : 'border-black/6 dark:border-white/6 bg-white dark:bg-white/3'
                                }`}
                            >
                                {p.highlight && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground whitespace-nowrap">
                                        Más popular
                                    </span>
                                )}

                                <div className="flex flex-col gap-1">
                                    <h3 className="text-[14px] font-semibold">{p.name}</h3>
                                    <div className="flex items-end gap-1.5 mt-1">
                                        {p.id === 'free' ? (
                                            <span className="text-[2rem] font-extrabold leading-none">0 €</span>
                                        ) : p.id === 'custom' ? (
                                            <span className="text-[2rem] font-extrabold leading-none">A medida</span>
                                        ) : priceFor(p.id) ? (
                                            <>
                                                <span className="text-[2rem] font-extrabold leading-none">
                                                    {formatPrice(priceFor(p.id)!.amount, priceFor(p.id)!.currency)}
                                                </span>
                                                <span className="text-[12px] text-muted-foreground mb-1">
                                                    / {priceFor(p.id)!.interval === 'month' ? 'mes' : 'año'}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-[2rem] font-extrabold leading-none text-muted-foreground/30">—</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</p>
                                </div>

                                {p.id === 'custom' ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2"
                                        onClick={() => void navigate({ to: '/contact' })}
                                    >
                                        <Mail size={13} />
                                        Contactar
                                    </Button>
                                ) : (
                                    <Button
                                        variant={p.highlight ? 'default' : 'outline'}
                                        size="sm"
                                        className="w-full"
                                        onClick={handleCta}
                                    >
                                        {p.id === 'free' ? 'Empezar gratis' : 'Suscribirse'}
                                    </Button>
                                )}

                                <ul className="flex flex-col gap-2">
                                    {p.features.map((feat) => (
                                        <li key={feat} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                                            <Check size={11} className="text-primary shrink-0" />
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA final */}
            <section className="py-20 px-4 border-t border-black/5 dark:border-white/5">
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="max-w-xl mx-auto text-center flex flex-col items-center gap-5"
                >
                    <div className="size-12 rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs flex items-center justify-center">
                        <FileText size={20} className="text-foreground/70" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <h2 className="text-[22px] font-bold tracking-tight">
                            Empieza hoy, gratis
                        </h2>
                        <p className="text-[13px] text-muted-foreground">
                            Únete y descubre lo sencillo que puede ser mantener todo ordenado.
                        </p>
                    </div>
                    <Button size="lg" className="gap-2 px-8" onClick={handleCta}>
                        {session ? 'Ir al dashboard' : 'Crear cuenta gratis'}
                        <ArrowRight size={14} />
                    </Button>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground/50">
                        <span className="flex items-center gap-1"><Lock size={10} /> Sin tarjeta</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><ShieldCheck size={10} /> Datos cifrados</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Zap size={10} /> Listo en 1 min</span>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="border-t border-black/5 dark:border-white/5 py-6 px-4">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold">IntelliDocs</span>
                    <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                        <span className="text-muted-foreground/40">© {new Date().getFullYear()}</span>
                        <button onClick={() => void navigate({ to: '/about' })} className="hover:text-foreground transition-colors">About</button>
                        <button onClick={() => void navigate({ to: '/contact' })} className="hover:text-foreground transition-colors">Contacto</button>
                        {!session && (
                            <button onClick={() => void navigate({ to: '/auth/login' })} className="hover:text-foreground transition-colors">Iniciar sesión</button>
                        )}
                    </div>
                </div>
            </footer>
        </div>
    )
}
