import type { PgTableChangePayload } from '@intellidocs/types'
import { getSocket, onSocketDestroy } from './socket'

type RealtimeHandler = (payload: PgTableChangePayload<any>) => void

type RealtimeEvent = {
    channel: string
    room?: string
    payload: PgTableChangePayload<any>
}

interface SubscriptionEntry {
    channel: string
    filters?: Record<string, string>
    handlers: Map<RealtimeHandler, number>
}

export interface RealtimeSubscriptionSlice {
    _subscriptions: Map<string, SubscriptionEntry>
    subscribe: (
        channel: string,
        handler: RealtimeHandler,
        filters?: Record<string, string>,
    ) => () => void
    _unsubscribe: (channelKey: string, handler: RealtimeHandler) => void
    _resubscribeAll: () => void
}

function normalizeFilters(
    filters?: Record<string, string>,
): Record<string, string> | undefined {
    if (!filters || Object.keys(filters).length === 0) return undefined

    return Object.fromEntries(
        Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)),
    )
}

function buildChannelKey(
    channel: string,
    filters?: Record<string, string>,
): string {
    const normalized = normalizeFilters(filters)
    if (!normalized) return channel

    const params = new URLSearchParams(normalized).toString()
    return `${channel}?${params}`
}

export function createRealtimeSubscription(): RealtimeSubscriptionSlice {
    // Usamos getSocket() de forma lazy en cada operación para que,
    // si destroySocket() se llama al cerrar sesión y se crea uno nuevo,
    // siempre operemos sobre el socket actual.
    let registeredSocket: ReturnType<typeof getSocket> | null = null

    function ensureListeners(socket: ReturnType<typeof getSocket>) {
        if (registeredSocket === socket) return
        registeredSocket = socket

        socket.on('event', (data: RealtimeEvent) => {
            const entry = slice._subscriptions.get(data.channel)
            if (!entry) return
            for (const handler of entry.handlers.keys()) {
                handler(data.payload)
            }
        })

        socket.on('connect', () => {
            slice._resubscribeAll()
        })
    }

    const slice: RealtimeSubscriptionSlice = {
        _subscriptions: new Map(),

        subscribe(channel, handler, filters) {
            const socket = getSocket()
            ensureListeners(socket)

            const normalizedFilters = normalizeFilters(filters)
            const channelKey = buildChannelKey(channel, normalizedFilters)

            let entry = this._subscriptions.get(channelKey)

            if (!entry) {
                entry = {
                    channel,
                    filters: normalizedFilters,
                    handlers: new Map(),
                }

                this._subscriptions.set(channelKey, entry)

                if (socket.connected) {
                    socket.emit(
                        'subscribe',
                        { channel, filters: normalizedFilters },
                        (result: { ok: boolean; error?: string }) => {
                            if (!result.ok) {
                                console.warn(
                                    `[realtime] subscribe failed for "${channelKey}": ${result.error ?? 'Unknown error'}`,
                                )
                            }
                        },
                    )
                }
            }

            entry.handlers.set(handler, (entry.handlers.get(handler) ?? 0) + 1)

            return () => this._unsubscribe(channelKey, handler)
        },

        _unsubscribe(channelKey, handler) {
            const entry = this._subscriptions.get(channelKey)
            if (!entry) return

            const current = entry.handlers.get(handler)
            if (!current) return

            if (current <= 1) {
                entry.handlers.delete(handler)
            } else {
                entry.handlers.set(handler, current - 1)
            }

            if (entry.handlers.size === 0) {
                const socket = getSocket()
                if (socket.connected) {
                    socket.emit(
                        'unsubscribe',
                        {
                            channel: entry.channel,
                            filters: entry.filters,
                        },
                        (result: { ok: boolean; error?: string }) => {
                            if (!result.ok) {
                                console.warn(
                                    `[realtime] unsubscribe failed for "${channelKey}": ${result.error ?? 'Unknown error'}`,
                                )
                            }
                        },
                    )
                }

                this._subscriptions.delete(channelKey)
            }
        },

        _resubscribeAll() {
            const socket = getSocket()
            for (const [, entry] of this._subscriptions) {
                socket.emit(
                    'subscribe',
                    {
                        channel: entry.channel,
                        filters: entry.filters,
                    },
                    (result: { ok: boolean; error?: string }) => {
                        if (!result.ok) {
                            const key = buildChannelKey(
                                entry.channel,
                                entry.filters,
                            )
                            console.warn(
                                `[realtime] resubscribe failed for "${key}": ${result.error ?? 'Unknown error'}`,
                            )
                        }
                    },
                )
            }
        },
    }

    // Registrar listeners en el socket inicial
    ensureListeners(getSocket())

    // Cuando el socket sea destruido (logout), resetear la referencia
    // para que ensureListeners los registre de nuevo en el socket nuevo
    onSocketDestroy(() => {
        registeredSocket = null
    })

    return slice
}
