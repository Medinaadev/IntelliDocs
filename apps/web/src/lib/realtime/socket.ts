import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { getApiUrl } from '../api'

let socket: Socket | null = null

// Callbacks que se ejecutan cuando el socket es destruido y reemplazado
const onDestroyCallbacks: Array<() => void> = []

/**
 * Devuelve siempre la misma instancia del socket.
 * No conecta hasta que llames a socket.connect()
 */
export function getSocket(): Socket {
    if (!socket) {
        socket = io(getApiUrl('/realtime'), {
            withCredentials: true, // envía la cookie access_token automáticamente
            autoConnect: false,    // no conecta hasta que lo digamos nosotros
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,
        })
    }

    return socket
}

export function destroySocket() {
    if (socket) {
        socket.disconnect()
        socket = null
        // Notificar a quien dependa del socket que fue reemplazado
        for (const cb of onDestroyCallbacks) cb()
    }
}

/** Registra un callback que se ejecuta cuando destroySocket() es llamado */
export function onSocketDestroy(cb: () => void) {
    onDestroyCallbacks.push(cb)
}
