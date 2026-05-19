import { DashboardSidebar } from '#/components/dashboard/sidebar/Sidebar'
import {
    initializeWorkspacesStore,
    useWorkspacesStore,
} from '#/stores/workspacesStore'
import { useWorkspaceStore } from '#/stores/workspaceStore'
import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/$workspaceId')({
    component: RouteComponent,
    notFoundComponent: DashboardNotFound,
    beforeLoad: async ({ params }) => {
        const { workspaceId } = params

        await initializeWorkspacesStore() // carga los workspaces antes de redirigir
        while (useWorkspacesStore.getState().isLoading) {
            await new Promise((resolve) => setTimeout(resolve, 100))
        }

        const workspace = useWorkspacesStore
            .getState()
            .workspaces.find((ws) => ws.id === workspaceId)

        if (!workspace) {
            toast.error(
                'Workspace no encontrado. Redirigiendo a la lista de workspaces.',
            )
            throw redirect({
                to: '/workspaces',
            })
        }

        const currentWorkspace = useWorkspaceStore.getState().workspace
        if (!currentWorkspace || currentWorkspace.id !== workspaceId) {
            useWorkspaceStore.getState().setWorkspace(workspace)
        }
    },
})

function RouteComponent() {
    return (
        <main className="flex flex-1 min-h-0">
            <DashboardSidebar />
            <div className="flex-1 min-h-0 overflow-y-auto">
                <Outlet />
            </div>
        </main>
    )
}

function DashboardNotFound() {
    const { workspaceId } = Route.useParams()

    return (
        <main className="flex flex-1 min-h-0">
            <DashboardSidebar />
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-4">
                <span className="text-7xl font-bold text-zinc-200 dark:text-zinc-800 select-none">
                    404
                </span>
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    Página no encontrada
                </h1>
                <p className="text-sm text-zinc-500 max-w-xs">
                    Esta sección no existe o fue movida.
                </p>
                <Link
                    to="/dashboard/$workspaceId"
                    params={{ workspaceId }}
                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
                >
                    Volver al dashboard
                </Link>
            </div>
        </main>
    )
}
