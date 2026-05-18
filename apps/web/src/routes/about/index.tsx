import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useHeaderStore } from '#/stores/headerStore'
import { motion } from 'framer-motion'
import {
    FileText,
    Server,
    Database,
    Layers,
    Cloud,
    Cpu,
    GraduationCap,
} from 'lucide-react'

export const Route = createFileRoute('/about/')({ component: AboutPage })

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, delay: i * 0.08, ease: 'easeOut' },
    }),
}

const STACK = [
    {
        icon: Layers,
        label: 'Frontend',
        items: ['React 19', 'TypeScript', 'TailwindCSS', 'TanStack Router', 'TanStack Query', 'Framer Motion', 'Zustand'],
    },
    {
        icon: Server,
        label: 'Backend',
        items: ['NestJS', 'TypeScript', 'JWT + Refresh Tokens', 'OAuth Google', 'BullMQ', 'Stripe'],
    },
    {
        icon: Database,
        label: 'Base de datos',
        items: ['PostgreSQL', 'Prisma ORM', 'Full-text search (tsvector)', 'Redis'],
    },
    {
        icon: Cloud,
        label: 'Almacenamiento',
        items: ['MinIO (S3-compatible)', 'URLs prefirmadas', 'Versionado de archivos'],
    },
    {
        icon: Cpu,
        label: 'Procesamiento',
        items: ['Extracción de texto PDF', 'Metadatos de imágenes', 'SHA-256 checksums', 'Colas asíncronas'],
    },
]

function AboutPage() {
    const { setSticky } = useHeaderStore()
    useEffect(() => {
        setSticky(false)
        return () => setSticky(true)
    }, [setSticky])

    return (
        <div className="flex flex-col max-w-3xl mx-auto px-4 py-10 gap-14">

            {/* intro */}
            <motion.section
                initial="hidden"
                animate="show"
                className="flex flex-col gap-5"
            >
                <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3">
                    <div className="size-12 rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs flex items-center justify-center">
                        <FileText size={20} className="text-foreground/70" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Proyecto Final de Grado · 2º DAW</span>
                        <span className="text-[13px] font-semibold">Mario Cuadrado Medina</span>
                    </div>
                </motion.div>

                <motion.h1 variants={fadeUp} custom={1} className="text-[28px] font-bold tracking-tight">
                    Sobre IntelliDocs
                </motion.h1>

                <motion.p variants={fadeUp} custom={2} className="text-[14px] text-muted-foreground leading-relaxed">
                    IntelliDocs es una plataforma de gestión documental inteligente desarrollada como
                    Proyecto Final de Grado del ciclo formativo de <strong className="text-foreground">Desarrollo de Aplicaciones Web</strong>.
                    El objetivo era construir una aplicación fullstack real, con todas las capas que
                    tendría un producto en producción: autenticación, almacenamiento en la nube,
                    procesamiento asíncrono y búsqueda avanzada.
                </motion.p>

                <motion.p variants={fadeUp} custom={3} className="text-[14px] text-muted-foreground leading-relaxed">
                    El proyecto va más allá de un simple CRUD. Los archivos se procesan automáticamente
                    al subirlos, extrayendo texto de PDFs, metadatos de imágenes y generando checksums,
                    permitiendo búsquedas sobre el contenido real de los documentos, no solo por nombre.
                </motion.p>
            </motion.section>

            {/* badge tfg */}
            <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-start gap-4 rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs p-5"
            >
                <div className="size-9 rounded-lg bg-black/4 dark:bg-white/6 flex items-center justify-center shrink-0 mt-0.5">
                    <GraduationCap size={16} className="text-foreground/70" />
                </div>
                <div className="flex flex-col gap-1">
                    <h3 className="text-[13px] font-semibold">Proyecto Final de Grado · 2º DAW</h3>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                        Desarrollado íntegramente como TFG del ciclo de Desarrollo de Aplicaciones Web.
                        Arquitectura monorepo con frontend React y backend NestJS, comunicados a través
                        de una API REST con autenticación JWT, sistema de colas con BullMQ y
                        almacenamiento compatible con S3.
                    </p>
                </div>
            </motion.div>

            {/* stack técnico */}
            <section className="flex flex-col gap-5">
                <h2 className="text-[16px] font-semibold">Stack técnico</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                    {STACK.map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true }}
                            variants={fadeUp}
                            custom={i * 0.3}
                            className="flex flex-col gap-3 rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs p-4"
                        >
                            <div className="flex items-center gap-2">
                                <div className="size-7 rounded-lg bg-black/4 dark:bg-white/6 flex items-center justify-center">
                                    <s.icon size={13} className="text-foreground/70" />
                                </div>
                                <span className="text-[12px] font-semibold">{s.label}</span>
                            </div>
                            <ul className="flex flex-wrap gap-1.5">
                                {s.items.map((item) => (
                                    <li
                                        key={item}
                                        className="inline-flex items-center rounded-md bg-black/4 dark:bg-white/6 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                                    >
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    )
}
