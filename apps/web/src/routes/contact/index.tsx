import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useHeaderStore } from '#/stores/headerStore'
import { motion } from 'framer-motion'
import { Mail, Send, Loader2, Check } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export const Route = createFileRoute('/contact/')({ component: ContactPage })

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, delay: i * 0.08, ease: 'easeOut' },
    }),
}

function ContactPage() {
    const { setSticky } = useHeaderStore()
    useEffect(() => {
        setSticky(false)
        return () => setSticky(true)
    }, [setSticky])

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [sent, setSent] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name || !email || !message) return
        setLoading(true)
        await new Promise((r) => setTimeout(r, 800))
        setLoading(false)
        setSent(true)
    }

    return (
        <div className="flex flex-col max-w-xl mx-auto px-4 py-16 gap-10">

            <motion.section
                initial="hidden"
                animate="show"
                className="flex flex-col gap-4"
            >
                <motion.div
                    variants={fadeUp}
                    custom={0}
                    className="size-12 rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs flex items-center justify-center"
                >
                    <Mail size={20} className="text-foreground/70" />
                </motion.div>

                <motion.h1
                    variants={fadeUp}
                    custom={1}
                    className="text-[28px] font-bold tracking-tight"
                >
                    Contacto
                </motion.h1>

                <motion.p
                    variants={fadeUp}
                    custom={2}
                    className="text-[14px] text-muted-foreground leading-relaxed"
                >
                    ¿Tienes alguna pregunta, sugerencia o quieres hablar sobre un
                    plan para tu empresa? Escríbenos y te respondemos en menos de 24 horas.
                </motion.p>
            </motion.section>

            <motion.div
                initial="hidden"
                animate="show"
                variants={fadeUp}
                custom={3}
                className="rounded-xl border border-black/6 dark:border-white/6 bg-white dark:bg-white/3 shadow-xs p-6"
            >
                {sent ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Check size={18} className="text-green-500" />
                        </div>
                        <p className="text-[14px] font-medium">¡Mensaje enviado!</p>
                        <p className="text-[12px] text-muted-foreground">
                            Te responderemos en menos de 24 horas.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-[12px]">Nombre</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Tu nombre"
                                className="h-8 text-[13px]"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-[12px]">Correo electrónico</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="h-8 text-[13px]"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-[12px]">Mensaje</Label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="¿En qué podemos ayudarte?"
                                rows={5}
                                required
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-[13px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="sm"
                            className="self-end gap-1.5"
                            disabled={loading || !name || !email || !message}
                        >
                            {loading ? (
                                <Loader2 size={13} className="animate-spin" />
                            ) : (
                                <Send size={13} />
                            )}
                            Enviar mensaje
                        </Button>
                    </form>
                )}
            </motion.div>
        </div>
    )
}
