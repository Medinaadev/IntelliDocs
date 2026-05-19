import { useState } from 'react'
import { useAuthStore } from '#/stores/authStore'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { AvatarImage, Avatar, AvatarFallback } from '../ui/avatar'
import { AnimatedThemeToggler } from '../ui/animated-theme-toggler'
import { useHeaderStore } from '#/stores/headerStore'
import { LayoutDashboard, LayoutGrid, LogOut, Menu, MessageSquareWarning, UserRound } from 'lucide-react'
import { cn } from '#/lib/utils'
import { useWorkspaceStore } from '#/stores/workspaceStore'
import { WorkspaceBadge } from '../workspaces/WorkspaceBadge'
import { AnimatePresence, motion } from 'framer-motion'
import { ProfileDialog } from './ProfileDialog'
import { useSidebarStore } from '#/stores/sidebarStore'

const Header = () => {
    const { session, isLoading, logout } = useAuthStore()
    const navigate = useNavigate()
    const { show, fixed, sticky, inDashboard } = useHeaderStore()
    const { workspace } = useWorkspaceStore()
    const [profileOpen, setProfileOpen] = useState(false)
    const { toggle: toggleSidebar } = useSidebarStore()

    if (!show) return null

    return (
    <>
        <header
            className={cn(
                'top-0 z-50 mb-10 w-full transition-colors',
                sticky && 'sticky',
                inDashboard && 'border-b border-border mb-0',
                fixed && 'fixed',
            )}
        >
            <div
                className={cn(
                    'flex items-center justify-between w-full mx-auto p-4 transition-all duration-300 ease-in-out',
                    inDashboard ? 'max-w-full' : 'max-w-7xl',
                )}
            >
                <div className="flex items-center gap-2">
                    {inDashboard && (
                        <button
                            className="md:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            onClick={toggleSidebar}
                            aria-label="Abrir menú"
                        >
                            <Menu size={18} />
                        </button>
                    )}
                    <h1 className="text-xl font-bold cursor-pointer" onClick={() => navigate({ to: '/' })}>IntelliDocs</h1>
                    {inDashboard && workspace && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={'workspace-header-badge-' + workspace.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex items-center gap-2"
                            >
                                <div className="border-r h-8 bg-border" />
                                <WorkspaceBadge plan={workspace.plan} />
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>

                <div className="flex items-center space-x-4">
                    <AnimatedThemeToggler
                        size={20}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 cursor-pointer transition-colors"
                    />

                    {isLoading ? (
                        <Skeleton className="w-8 h-8" />
                    ) : session ? (
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger className="cursor-pointer">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={session.user.image} />
                                        <AvatarFallback>
                                            {session.user.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                    align="center"
                                    sideOffset={6}
                                    className="p-2"
                                >
                                    <DropdownMenuItem
                                        className="hover:bg-black/5"
                                        onClick={() => setProfileOpen(true)}
                                    >
                                        <UserRound />
                                        Mi perfil
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="hover:bg-black/5"
                                        onClick={() => {
                                            navigate({ to: '/dashboard' })
                                        }}
                                    >
                                        <LayoutDashboard />
                                        Dashboard
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="hover:bg-black/5"
                                        onClick={() => {
                                            navigate({ to: '/workspaces' })
                                        }}
                                    >
                                        <LayoutGrid />
                                        Workspaces
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="hover:bg-black/5"
                                        onClick={() => window.open('https://github.com/Medinaadev/IntelliDocs/issues/new', '_blank')}
                                    >
                                        <MessageSquareWarning />
                                        Reportar problema
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        variant="destructive"
                                        onSelect={() =>
                                            logout().then(() =>
                                                navigate({ to: '/' }),
                                            )
                                        }
                                    >
                                        <LogOut />
                                        Cerrar sesión
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <Button
                            onClick={() => navigate({ to: '/auth/login' })}
                            className="px-4 py-2 dark:text-white"
                        >
                            Login
                        </Button>
                    )}
                </div>
            </div>
        </header>

        {session && (
            <ProfileDialog
                open={profileOpen}
                onOpenChange={setProfileOpen}
            />
        )}
    </>
    )
}

export default Header
