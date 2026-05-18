import { WorkspaceList } from '#/components/workspaces/list/WorkspaceList'
import { protectedRoute } from '#/lib/auth'
import { useWorkspacesStore } from '#/stores/workspacesStore'
import { createFileRoute } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { useMemo } from 'react'
import z from 'zod'

const workspaceSearchSchema = z.object({
    new: z.boolean().optional(),
})

export const Route = createFileRoute('/workspaces/')({
    component: RouteComponent,
    beforeLoad: async ({ location }) => {
        await protectedRoute(location)
    },
    validateSearch: zodValidator(workspaceSearchSchema),
})

function RouteComponent() {
    const { workspaces, isLoading, getWorkspacesByLastActive } =
        useWorkspacesStore()

    const sortedWorkspaces = useMemo(() => {
        return getWorkspacesByLastActive()
    }, [workspaces])

    return (
        <main className="flex flex-1 min-h-0 items-center justify-center px-4">
            <WorkspaceList
                workspaces={sortedWorkspaces}
                isLoading={isLoading}
            />
        </main>
    )
}
