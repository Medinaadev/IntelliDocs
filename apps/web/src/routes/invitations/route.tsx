import { useHeaderStore } from '#/stores/headerStore'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useLayoutEffect } from 'react'

export const Route = createFileRoute('/invitations')({
    component: RouteComponent,
})

function RouteComponent() {
    useLayoutEffect(() => {
        useHeaderStore.getState().setFixed(true)

        return () => {
            useHeaderStore.getState().setFixed(false)
        }
    }, [])

    return <Outlet />
}
