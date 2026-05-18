import { useEffect } from 'react'
import type { PgTableChangePayload } from '@intellidocs/types'
import { getSocket } from './socket'

interface UseRealtimeChannelOptions<TRow> {
    channel: string
    filters?: Record<string, string>
    onEvent: (payload: PgTableChangePayload<TRow>) => void
    enabled?: boolean
}

export function useRealtimeChannel<TRow = unknown>({
    channel,
    filters = {},
    onEvent,
    enabled = true,
}: UseRealtimeChannelOptions<TRow>) {
    useEffect(() => {
        if (!enabled) return

        const socket = getSocket()

        const handleEvent = (data: {
            channel: string
            payload: PgTableChangePayload<TRow>
        }) => {
            if (data.channel === channel) {
                onEvent(data.payload)
            }
        }

        socket.emit(
            'subscribe',
            { channel, filters: filters },
            (response: { ok: boolean; error?: string }) => {
                if (!response.ok) {
                    console.error(
                        `[Realtime] Failed to subscribe to "${channel}":`,
                        response.error,
                    )
                } else {
                    console.log(`[Realtime] Subscribed to "${channel}"`)
                }
            },
        )

        socket.on('event', handleEvent)

        return () => {
            socket.emit('unsubscribe', { channel, filters })
            socket.off('event', handleEvent)
            console.log(`[Realtime] Unsubscribed from "${channel}"`)
        }
    }, [channel, filters, enabled])
}
