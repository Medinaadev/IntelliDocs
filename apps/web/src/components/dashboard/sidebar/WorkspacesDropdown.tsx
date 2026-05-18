import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { useWorkspacesStore } from '#/stores/workspacesStore'
import { useWorkspaceStore } from '#/stores/workspaceStore'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, LayersPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export const DashboardWorkspacesDropdown = () => {
    const { workspace } = useWorkspaceStore()
    const { getWorkspacesByLastActive } = useWorkspacesStore()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const navigate = useNavigate()

    if (!workspace) return null

    const sortedWorkspaces = getWorkspacesByLastActive().filter(
        (ws) => ws.id !== workspace.id,
    )

    return (
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="flex flex-row w-full h-fit items-center text-start p-2 px-4 shadow-md"
                >
                    <AnimatePresence initial={false} mode="wait">
                        <motion.div
                            key={'workspace-dropdown-trigger-' + workspace.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2 flex-1 w-full"
                        >
                            <Avatar className="w-6 h-6 shadow-md" size="sm">
                                <AvatarImage
                                    src={workspace.image || undefined}
                                    alt={workspace.name}
                                />
                                <AvatarFallback>
                                    {workspace.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 text-start text-sm font-medium truncate">
                                {workspace.name}
                            </span>
                            <ChevronDown
                                className={`transition-transform ${dropdownOpen ? '' : '-rotate-90'} text-gray-400 duration-300 min-w-4 min-h-4`}
                            />
                        </motion.div>
                    </AnimatePresence>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="p-0 overflow-hidden">
                <div className="max-h-60 overflow-y-auto p-1">
                    <DropdownMenuItem
                        key={'create-new-workspace'}
                        onClick={() => {
                            navigate({
                                to: '/workspaces',
                                search: {
                                    new: true,
                                },
                            })
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <LayersPlus className="text-gray-400" />
                            <span className="text-sm font-medium">
                                Crear nuevo workspace
                            </span>
                        </div>
                    </DropdownMenuItem>

                    {sortedWorkspaces.map((ws) => (
                        <DropdownMenuItem
                            key={ws.id}
                            onClick={() => {
                                toast.success('Ahora estás en ' + ws.name)
                                navigate({
                                    to: '/dashboard/$workspaceId',
                                    params: { workspaceId: ws.id },
                                })
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6 shadow-md" size="sm">
                                    <AvatarImage
                                        src={ws.image || undefined}
                                        alt={ws.name}
                                    />
                                    <AvatarFallback>
                                        {ws.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">
                                    {ws.name}
                                </span>
                            </div>
                        </DropdownMenuItem>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
