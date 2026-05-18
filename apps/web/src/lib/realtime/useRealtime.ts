import { useEffect } from 'react'
import { useAuthStore } from '#/stores/authStore'
import { destroySocket, getSocket } from './socket'

/**
 * Monta la conexión del socket cuando hay sesión
 * y la destruye cuando el usuario cierra sesión.
 * Montar en el root de la app una sola vez.
 */
export function useRealtime() {
    const session = useAuthStore((state) => state.session)

    useEffect(() => {
        if (!session) {
            destroySocket()
            return
        }

        const socket = getSocket()

        socket.on('connect', () => {
            console.log('[Realtime] Connected:', socket.id)
        })

        socket.on('disconnect', (reason) => {
            console.log('[Realtime] Disconnected:', reason)
        })

        socket.on('connect_error', (error) => {
            console.error('[Realtime] Connection error:', error.message)
        })

        socket.on('refresh_token_required', async () => {
            console.warn('[Realtime] Token expired, refreshing...')
            await useAuthStore.getState().refreshSession()
        })

        socket.connect()

        return () => {
            socket.off('connect')
            socket.off('disconnect')
            socket.off('connect_error')
        }
    }, [session])
}
