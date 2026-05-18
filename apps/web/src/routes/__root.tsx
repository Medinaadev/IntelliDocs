import { Outlet, createRootRoute } from '@tanstack/react-router'

import '../styles.css'
import { LightRays } from '#/components/ui/light-rays'
import Header from '#/components/header/Header'
import { useThemeStore } from '#/stores/themeStore'
import { Providers } from '#/components/Providers'
import { useRealtime } from '#/lib/realtime/useRealtime'

export const Route = createRootRoute({
    component: RootComponent,
    beforeLoad: async () => {
        useThemeStore.getState().initTheme() // Initialize theme on app load
    },
})
function RootComponent() {
    useRealtime()

    return (
        <Providers>
            <div className="fixed w-screen h-screen top-0 left-0 -z-10">
                <LightRays />
            </div>
            <div className="flex flex-col h-screen justify-between">
                <Header />
                <div className="flex flex-col flex-1 min-h-0">
                    <Outlet />
                </div>
            </div>
        </Providers>
    )
}
