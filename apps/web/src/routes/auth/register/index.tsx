import { Button } from '#/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { api } from '#/lib/api'
import { toast } from 'sonner'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/register/')({
    component: RouteComponent,
    head: () => ({ title: 'Registrarse — IntelliDocs' }),
})

interface RegisterFormValues {
    name: string
    email: string
    password: string
    confirmPassword: string
}

function RouteComponent() {
    const navigate = useNavigate()

    const form = useForm({
        defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
        } as RegisterFormValues,
        validators: {
            onChange: z
                .object({
                    name: z
                        .string()
                        .min(2, 'El nombre debe tener al menos 2 caracteres'),
                    email: z.string().email('Email inválido'),
                    password: z
                        .string()
                        .min(
                            6,
                            'La contraseña debe tener al menos 6 caracteres',
                        ),
                    confirmPassword: z.string(),
                })
                .refine((data) => data.password === data.confirmPassword, {
                    message: 'Las contraseñas no coinciden',
                    path: ['confirmPassword'], // El error se asignará a este campo
                }),
        },
        onSubmit: async ({ value }) => {
            const toastId = toast.loading('Registrando tu cuenta...')

            try {
                const response = await api.post<{ message: string }>(
                    '/auth/register',
                    {
                        name: value.name,
                        email: value.email,
                        password: value.password,
                    },
                )

                toast.success(
                    response.message
                        ? response.message
                        : '¡Registro exitoso! Verifica tu email para continuar.',
                    { id: toastId },
                )
                navigate({ to: '/auth/login' })
            } catch (error: any) {
                toast.error(
                    error.message
                        ? error.message
                        : 'Error registrando tu cuenta. Intenta nuevamente.',
                    { id: toastId },
                )
            }
        },
    })

    return (
        <main className="flex flex-1 items-center justify-center w-full px-4">
            <Card className="w-full max-w-md py-8 md:px-8">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">
                        Crea tu cuenta
                    </CardTitle>
                    <CardDescription className="text-center">
                        Regístrate para empezar a usar nuestra aplicación
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            form.handleSubmit()
                        }}
                    >
                        <div className="flex flex-col gap-4">
                            <form.Field name="name">
                                {(field) => (
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Nombre</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="Tu nombre"
                                            value={field.state.value}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {!field.state.meta.isValid && (
                                            <em className="text-red-500">
                                                {
                                                    field.state.meta.errors[0]
                                                        ?.message
                                                }
                                            </em>
                                        )}
                                    </div>
                                )}
                            </form.Field>
                            <form.Field name="email">
                                {(field) => (
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="m@example.com"
                                            value={field.state.value}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {!field.state.meta.isValid && (
                                            <em className="text-red-500">
                                                {
                                                    field.state.meta.errors[0]
                                                        ?.message
                                                }
                                            </em>
                                        )}
                                    </div>
                                )}
                            </form.Field>
                            <form.Field name="password">
                                {(field) => (
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">
                                            Contraseña
                                        </Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={field.state.value}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {!field.state.meta.isValid && (
                                            <em className="text-red-500">
                                                {
                                                    field.state.meta.errors[0]
                                                        ?.message
                                                }
                                            </em>
                                        )}
                                    </div>
                                )}
                            </form.Field>
                            <form.Field name="confirmPassword">
                                {(field) => (
                                    <div className="grid gap-2">
                                        <Label htmlFor="confirm-password">
                                            Confirmar contraseña
                                        </Label>
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={field.state.value}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {!field.state.meta.isValid && (
                                            <em className="text-red-500">
                                                {
                                                    field.state.meta.errors[0]
                                                        ?.message
                                                }
                                            </em>
                                        )}
                                    </div>
                                )}
                            </form.Field>
                        </div>

                        <div className="flex flex-col gap-2 mt-6">
                            <Button
                                onClick={() => form.handleSubmit()}
                                className="w-full"
                            >
                                Registrate
                            </Button>

                            <div className="text-center text-sm text-muted-foreground">
                                ¿Tienes una cuenta?{' '}
                                <Link
                                    to="/auth/login"
                                    className="underline underline-offset-4 hover:text-primary ml-2"
                                >
                                    Inicia sesión aquí
                                </Link>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </main>
    )
}
