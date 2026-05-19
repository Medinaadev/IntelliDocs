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
import { useAuthStore } from '#/stores/authStore'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { zodValidator } from '@tanstack/zod-adapter'

const loginSchema = z.object({
    redirect: z.string().optional(),
})

export const Route = createFileRoute('/auth/login/')({
    component: LoginComponent,
    validateSearch: zodValidator(loginSchema),
    head: () => ({ title: 'Iniciar sesión — IntelliDocs' }),
})

interface LoginFormValues {
    email: string
    password: string
}

function LoginComponent() {
    const { login } = useAuthStore()
    const navigate = useNavigate()
    const { redirect } = Route.useSearch()

    const form = useForm({
        defaultValues: {
            email: '',
            password: '',
        } as LoginFormValues,
        validators: {
            onChange: z.object({
                email: z.email('Email inválido'),
                password: z
                    .string()
                    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
            }),
        },
        onSubmit: async ({ value }) => {
            const toastId = toast.loading('Iniciando sesión...')
            const { success, error } = await login('credentials', {
                email: value.email,
                password: value.password,
            })

            if (success) {
                toast.success('¡Inicio de sesión exitoso!', { id: toastId })
                navigate({ to: redirect || '/' })
            } else {
                toast.error(error || 'Error al iniciar sesión', { id: toastId })
            }
        },
    })

    return (
        <main className="flex flex-1 items-center justify-center w-full px-4">
            <Card className="w-full max-w-md py-8 md:px-8">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">
                        Iniciar sesión
                    </CardTitle>
                    <CardDescription className="text-center">
                        Inicia sesión con tu correo electrónico o tu cuenta de
                        Google para continuar
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
                            <form.Field name="email">
                                {(field) => (
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="m@example.com"
                                            value={field.state.value}
                                            onChange={(e) => {
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }}
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
                                            onChange={(e) => {
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }}
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
                            <Button type="submit" className="w-full">
                                Iniciar sesión
                            </Button>

                            <Button
                                type="button"
                                onClick={() =>
                                    login('google', { redirectUri: redirect })
                                }
                                variant="outline"
                                className="px-4 py-2 w-full"
                            >
                                Iniciar sesión con Google
                            </Button>

                            <div className="text-center text-sm text-muted-foreground">
                                ¿No tienes una cuenta?{' '}
                                <Link
                                    to="/auth/register"
                                    className="underline underline-offset-4 hover:text-primary ml-2"
                                >
                                    Regístrate aquí
                                </Link>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </main>
    )
}
