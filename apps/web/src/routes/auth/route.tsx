import { authRoute } from '#/lib/auth'
import { useHeaderStore } from '#/stores/headerStore'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useLayoutEffect } from 'react'

export const Route = createFileRoute('/auth')({
    component: RouteComponent,
    loader: authRoute,
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
