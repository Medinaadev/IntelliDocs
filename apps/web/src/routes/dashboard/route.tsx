import { protectedRoute } from '#/lib/auth'
import { useHeaderStore } from '#/stores/headerStore'
import {
    initializeWorkspacesStore,
    useWorkspacesStore,
} from '#/stores/workspacesStore'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/dashboard')({
    component: RouteComponent,
    beforeLoad: async ({ location }) => {
        await protectedRoute(location)
        useHeaderStore.getState().setInDashboard(true)

        await initializeWorkspacesStore() // carga los workspaces antes de redirigir
        if (location.pathname !== '/dashboard') return // si ya estamos en un workspace no hace falta redirigir
        while (useWorkspacesStore.getState().isLoading) {
            await new Promise((resolve) => setTimeout(resolve, 100))
        }

        if (useWorkspacesStore.getState().workspaces.length > 0) {
            const firstWorkspaceId = useWorkspacesStore
                .getState()
                .getWorkspacesByLastActive()[0].id

            throw redirect({
                to: `/dashboard/$workspaceId`,
                params: { workspaceId: firstWorkspaceId },
            })
        }

        throw redirect({
            to: '/workspaces',
            search: { new: true },
        })
    },
})

function RouteComponent() {
    useEffect(() => {
        useHeaderStore.getState().setInDashboard(true)

        return () => {
            useHeaderStore.getState().setInDashboard(false)
        }
    }, [])

    return <Outlet />
}
