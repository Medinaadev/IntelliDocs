import { LayoutGrid, Loader, Plus } from 'lucide-react'
import { Button } from '../../ui/button'
import { cn } from '#/lib/utils'
import { WorkspaceListItem } from './WorkspaceListItem'
import { motion } from 'framer-motion'
import { CreateWorkspaceDialog } from '../CreateWorkspaceDialog'
import type { ClientWorkspaceData } from '@intellidocs/types'
import { getRouteApi } from '@tanstack/react-router'

const routeApi = getRouteApi('/workspaces/')

export const WorkspaceList = ({
    workspaces,
    isLoading = false,
}: {
    workspaces: ClientWorkspaceData[]
    isLoading?: boolean
}) => {
    const { new: isNew } = routeApi.useSearch()

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden flex flex-col min-h-0 backdrop-blur-md bg-black/10 border border-black/10 dark:bg-white/5 dark:border-white/10 max-w-sm w-full h-140 rounded-xl shadow-md"
        >
            <div className="flex p-4 pb-3 items-center justify-between text-lg font-bold text-center border-b border-black/10 dark:border-white/10">
                <div className="flex items-center gap-2 text-black dark:text-gray-200">
                    <LayoutGrid />
                    <div className="flex flex-col items-start leading-tight">
                        <span>Workspaces</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                            Selecciona o crea un workspace
                        </span>
                    </div>
                </div>

                <CreateWorkspaceDialog open={isNew}>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-auto p-2 bg-black/5 hover:bg-black/10 border-black/10 hover:border-black/20 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:hover:border-white/20"
                    >
                        <Plus />
                    </Button>
                </CreateWorkspaceDialog>
            </div>

            <div
                className={cn(
                    'flex flex-col flex-1 overflow-y-auto py-2 px-4',
                    isLoading &&
                        'pointer-events-none select-none justify-center',
                )}
            >
                {isLoading ? (
                    <Loader className="animate-spin text-gray-500 mx-auto mb-10" />
                ) : (
                    <>
                        {workspaces.length === 0 && (
                            <p className="text-sm text-black/75 dark:text-gray-400/75 font-semibold text-center mt-10">
                                No tienes workspaces disponibles. Crea uno para
                                empezar a colaborar con tu equipo.
                            </p>
                        )}

                        {workspaces.map((workspace, index) => (
                            <WorkspaceListItem
                                key={workspace.id}
                                delay={index * 0.1}
                                workspace={workspace}
                            />
                        ))}
                    </>
                )}
            </div>
        </motion.div>
    )
}
