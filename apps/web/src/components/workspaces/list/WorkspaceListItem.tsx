import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar'
import { motion } from 'framer-motion'
import { WorkspaceBadge } from '../WorkspaceBadge'
import type { ClientWorkspaceData } from '@intellidocs/types'
import { useNavigate } from '@tanstack/react-router'

export const WorkspaceListItem = ({
    workspace,
    delay,
}: {
    workspace: ClientWorkspaceData
    delay: number
}) => {
    const navigate = useNavigate()

    return (
        <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay }}
            onClick={() =>
                navigate({
                    to: '/dashboard/$workspaceId',
                    params: { workspaceId: workspace.id },
                })
            }
            className="flex items-center text-start justify-between gap-4 bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10 rounded-lg px-3 py-2.5 mb-3 hover:bg-black/10 hover:border-black/20 dark:hover:bg-white/10 dark:hover:border-white/20 transition-colors cursor-pointer"
        >
            <Avatar size="lg">
                <AvatarImage
                    src={workspace.image ?? undefined}
                    alt={workspace.name}
                />
                <AvatarFallback className="text-md">
                    {workspace.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium max-w-xs truncate">
                        {workspace.name}
                    </p>
                    <WorkspaceBadge plan={workspace.plan} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {workspace.memberCount}{' '}
                    {workspace.memberCount === 1 ? 'miembro' : 'miembros'}
                </p>
            </div>
        </motion.button>
    )
}
