import { initializeAuthStore, useAuthStore } from '#/stores/authStore'
import { redirect } from '@tanstack/react-router'

export const protectedRoute = async (location: any) => {
    await initializeAuthStore() // Ensure the auth store is initialized before checking authentication status

    const isAuthenticated = useAuthStore.getState().isAuthenticated()
    if (!isAuthenticated) {
        throw redirect({
            to: '/auth/login',
            search: {
                redirect: location.href, // Preserve the intended destination for after login
            },
        })
    }
}

export const authRoute = async () => {
    await initializeAuthStore() // Ensure the auth store is initialized before checking authentication status

    const isAuthenticated = useAuthStore.getState().isAuthenticated()
    if (isAuthenticated) {
        throw redirect({
            to: '/',
        })
    }
}
