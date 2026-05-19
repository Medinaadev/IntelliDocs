import { HeadContent, Link, Outlet, createRootRoute } from '@tanstack/react-router'

import '../styles.css'
import { LightRays } from '#/components/ui/light-rays'
import Header from '#/components/header/Header'
import { useThemeStore } from '#/stores/themeStore'
import { Providers } from '#/components/Providers'
import { useRealtime } from '#/lib/realtime/useRealtime'

export const Route = createRootRoute({
    component: RootComponent,
    notFoundComponent: NotFoundPage,
    head: () => ({
        title: 'IntelliDocs',
    }),
    beforeLoad: async () => {
        useThemeStore.getState().initTheme()
    },
})
function RootComponent() {
    useRealtime()

    return (
        <Providers>
            <HeadContent />
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

function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-4">
            <span className="text-7xl font-bold text-zinc-200 dark:text-zinc-800 select-none">
                404
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                Página no encontrada
            </h1>
            <p className="text-sm text-zinc-500 max-w-xs">
                La ruta que buscas no existe o fue movida.
            </p>
            <Link
                to="/"
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
            >
                Volver al inicio
            </Link>
        </div>
    )
}
