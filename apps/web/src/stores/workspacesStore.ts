import { api } from '#/lib/api'
import { create } from 'zustand'
import { useAuthStore } from './authStore'
import type {
    PgTableChangePayload,
    ClientWorkspaceData,
} from '@intellidocs/types'
import type { RealtimeSubscriptionSlice } from '#/lib/realtime/createRealtimeSubscription'
import { createRealtimeSubscription } from '#/lib/realtime/createRealtimeSubscription'
import { useWorkspaceStore } from './workspaceStore'

interface WorkspacesStore extends RealtimeSubscriptionSlice {
    initialized: boolean
    isLoading: boolean
    workspaces: ClientWorkspaceData[]
    fetchWorkspaces: () => Promise<void>
    subscribeToWorkspaces: () => () => void
    getWorkspaceById: (id: string) => ClientWorkspaceData | undefined
    getWorkspacesByLastActive: () => ClientWorkspaceData[]
    updateLastActive: (workspaceId: string) => Promise<void>
}

export const useWorkspacesStore = create<WorkspacesStore>((set, get) => ({
    ...createRealtimeSubscription(),

    initialized: false,
    isLoading: true,
    workspaces: [],

    fetchWorkspaces: async () => {
        try {
            const response = await api.get<{
                workspaces: ClientWorkspaceData[]
            }>('/workspaces?memberCount=true&lastActiveAt=true')
            set({ workspaces: response.workspaces, initialized: true })
        } catch (error) {
            console.error('Error fetching workspaces:', error)
        } finally {
            set({ isLoading: false })
        }
    },

    subscribeToWorkspaces: () => {
        return get().subscribe(
            `Workspace`,
            (payload: PgTableChangePayload<ClientWorkspaceData>) => {
                switch (payload.event) {
                    case 'INSERT':
                        set((state) => ({
                            workspaces: [...state.workspaces, payload.data],
                        }))
                        break
                    case 'DELETE':
                        set((state) => ({
                            workspaces: state.workspaces.filter(
                                (ws) => ws.id !== payload.data.id,
                            ),
                        }))
                        break
                    case 'UPDATE':
                        set((state) => ({
                            workspaces: state.workspaces.map((ws) =>
                                ws.id === payload.data.new.id
                                    ? { ...ws, ...payload.data.new }
                                    : ws,
                            ),
                        }))

                        break
                }

                // Si el workspace activo fue actualizado, sincronizar los datos
                // sin llamar a setWorkspace (que registraría actividad innecesariamente)
                const activeWorkspaceId =
                    useWorkspaceStore.getState().workspace?.id
                if (
                    payload.event === 'UPDATE' &&
                    payload.data.new.id === activeWorkspaceId
                ) {
                    const updated = get().getWorkspaceById(activeWorkspaceId)
                    if (updated)
                        useWorkspaceStore.getState().syncWorkspace(updated)
                }
            },
        )
    },

    getWorkspaceById: (id) => {
        return get().workspaces.find((ws) => ws.id === id)
    },

    getWorkspacesByLastActive: () => {
        const workspaces = get().workspaces
        return [...workspaces].sort((a, b) => {
            const aTime = a.lastActiveAt
                ? new Date(a.lastActiveAt).getTime()
                : 0
            const bTime = b.lastActiveAt
                ? new Date(b.lastActiveAt).getTime()
                : 0
            return bTime - aTime
        })
    },

    updateLastActive: async (workspaceId: string) => {
        try {
            set((state) => ({
                workspaces: state.workspaces.map((ws) =>
                    ws.id === workspaceId
                        ? { ...ws, lastActiveAt: new Date() }
                        : ws,
                ),
            }))
            await api.post(
                `/workspaces/${workspaceId}/members/update-last-active`,
            )
        } catch (error) {
            console.error('Error updating last active time:', error)
        }
    },
}))

export const initializeWorkspacesStore = async () => {
    if (useWorkspacesStore.getState().initialized) return
    useWorkspacesStore.setState({ initialized: true })

    await useAuthStore.getState().awaitSessionCheck()
    if (!useAuthStore.getState().session) {
        console.warn('No user session found. Skipping workspaces fetch.')
        return
    }

    await useWorkspacesStore.getState().fetchWorkspaces()
}

export const destroyWorkspacesStore = () => {
    useWorkspacesStore.setState({
        initialized: false,
        isLoading: true,
        workspaces: [],
    })
}
