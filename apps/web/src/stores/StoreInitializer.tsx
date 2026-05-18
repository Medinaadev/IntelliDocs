import { useEffect } from 'react'
import { initializeAuthStore, useAuthStore } from './authStore'
import {
    initializeWorkspacesStore,
    useWorkspacesStore,
} from './workspacesStore'

export const StoreInitializer = () => {
    const { session } = useAuthStore()
    const { subscribeToWorkspaces } = useWorkspacesStore()

    useEffect(() => {
        initializeAuthStore()
    }, [])

    useEffect(() => {
        if (!session) return
        initializeWorkspacesStore()

        const workspacesSubscription = subscribeToWorkspaces()

        return () => {
            workspacesSubscription()
        }
    }, [session])

    return null
}
