import { Spinner } from '#/components/ui/spinner'
import { api } from '#/lib/api'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

const verifyEmailSchema = z.object({
    token: z.string().min(1, 'Token de verificación es requerido').optional(),
})

export const Route = createFileRoute('/auth/verify-email/')({
    component: VerifyEmailComponent,
    validateSearch: zodValidator(verifyEmailSchema),
    head: () => ({ title: 'Verificar email — IntelliDocs' }),
})

function VerifyEmailComponent() {
    const { token } = Route.useSearch()
    const navigate = useNavigate()

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                await api.post('/auth/verify-email', { token })

                toast.success(
                    '¡Email verificado exitosamente! Ya puedes iniciar sesión.',
                )
                navigate({ to: '/auth/login', replace: true })
            } catch (error) {
                console.error('Error verificando email:', error)

                const errorMessage =
                    error instanceof Error &&
                    'response' in error &&
                    (error as any).response?.data?.message
                        ? (error as any).response.data.message
                        : 'El enlace de verificación es inválido o ha expirado.'

                toast.error(errorMessage)
                navigate({ to: '/auth/register', replace: true })
            }
        }

        if (!token) {
            toast.error('Token de verificación no proporcionado')
            navigate({ to: '/auth/register', replace: true })
            return
        }

        verifyEmail()
    }, [token, navigate])

    return (
        <main className="flex flex-1 items-center justify-center w-full px-4">
            <div className="text-center">
                <Spinner />
                <p className="text-gray-600 mt-4">Verificando tu email...</p>
            </div>
        </main>
    )
}
