import { DashboardSidebar } from '#/components/dashboard/sidebar/Sidebar'
import {
    initializeWorkspacesStore,
    useWorkspacesStore,
} from '#/stores/workspacesStore'
import { useWorkspaceStore } from '#/stores/workspaceStore'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/$workspaceId')({
    component: RouteComponent,
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
