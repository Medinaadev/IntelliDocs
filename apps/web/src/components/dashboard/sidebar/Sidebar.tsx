import {
    Activity,
    Blocks,
    Cpu,
    DatabaseZap,
    FingerprintPattern,
    NotebookText,
    Search,
    Settings,
    Tags,
    Trash,
    UserStar,
    X,
    Zap,
    Clock,
} from 'lucide-react'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { useWorkspaceStore } from '#/stores/workspaceStore'
import { cn } from '#/lib/utils'
import { StorageIndicator } from './StorageIndicator'
import { DashboardWorkspacesDropdown } from './WorkspacesDropdown'
import { useSidebarStore } from '#/stores/sidebarStore'

const CATEGORIES = [
    {
        name: 'General',
        paths: [
            {
                name: 'Resumen',
                path: '/dashboard/$workspaceId',
                icon: <NotebookText size={18} />,
            },
            {
                name: 'Buscar',
                path: '/dashboard/$workspaceId/search',
                icon: <Search size={18} />,
            },
        ],
    },

    {
        name: 'Documentos',
        paths: [
            {
                name: 'Drive',
                path: '/dashboard/$workspaceId/drive',
                icon: <DatabaseZap size={18} />,
            },
            {
                name: 'Etiquetas',
                path: '/dashboard/$workspaceId/labels',
                icon: <Tags size={18} />,
            },
            {
                name: 'Papelera',
                path: '/dashboard/$workspaceId/trash',
                icon: <Trash size={18} />,
            },
        ],
    },

    {
        name: 'Gestión',
        paths: [
            {
                name: 'Actividad',
                path: '/dashboard/$workspaceId/activity',
                icon: <Activity size={18} />,
            },
            {
                name: 'Procesamiento',
                path: '/dashboard/$workspaceId/processing',
                icon: <Cpu size={18} />,
            },
        ],
    },

    {
        name: 'Configuración',
        paths: [
            {
                name: 'Planes',
                path: '/dashboard/$workspaceId/plans',
                icon: <Zap size={18} />,
            },
            {
                name: 'Miembros',
                path: '/dashboard/$workspaceId/members',
                icon: <UserStar size={18} />,
            },
            {
                name: 'Integraciones',
                path: '/dashboard/$workspaceId/integrations',
                icon: <Blocks size={18} />,
                comingSoon: true,
            },
            {
                name: 'Seguridad',
                path: '/dashboard/$workspaceId/security',
                icon: <FingerprintPattern size={18} />,
                comingSoon: true,
            },
            {
                name: 'Ajustes',
                path: '/dashboard/$workspaceId/settings',
                icon: <Settings size={18} />,
            },
        ],
    },
]

export const DashboardSidebar = () => {
    const { workspace } = useWorkspaceStore()
    const matchRoute = useMatchRoute()
    const { isOpen, close } = useSidebarStore()

    return (
        <>

            {/* sidebar, fijo en mobile con animacion, relativo en md */}
            <div
                className={cn(
                    'flex flex-col border-r w-full md:w-64 min-h-0 p-4 pb-0 gap-4',
                    'bg-background/80 backdrop-blur-xl md:bg-transparent md:backdrop-blur-none',
                    'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out',
                    'md:relative md:h-full md:z-auto md:translate-x-0',
                    isOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                        <DashboardWorkspacesDropdown />
                    </div>
                    <button
                        className="md:hidden shrink-0 flex items-center justify-center w-8 h-8 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        onClick={close}
                        aria-label="Cerrar menú"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="flex-1 w-full overflow-y-auto min-h-0 scrollbar-hide pb-2">
                    {CATEGORIES.map((category) => (
                        <div key={category.name} className="mb-6 last:mb-0">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-500 uppercase mb-2 px-1">
                                {category.name}
                            </p>
                            <div className="flex flex-col gap-1">
                                {category.paths.map((path) => {
                                    if (path.comingSoon) {
                                        return (
                                            <div
                                                key={path.name}
                                                className="flex items-center gap-2 text-[13px] font-medium rounded-lg px-3 py-2 opacity-40 cursor-default select-none"
                                            >
                                                {path.icon}
                                                <span className="flex-1 min-w-0">{path.name}</span>
                                                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-black/8 dark:bg-white/10 text-muted-foreground border border-black/10 dark:border-white/15 shrink-0">
                                                    <Clock size={8} />
                                                    Pronto
                                                </span>
                                            </div>
                                        )
                                    }

                                    const isActive = matchRoute({
                                        to: path.path,
                                    })

                                    return (
                                        <Link
                                            key={path.name}
                                            to={path.path}
                                            params={{
                                                workspaceId:
                                                    workspace?.id || '',
                                            }}
                                            onClick={close}
                                            className={cn(
                                                'flex items-center gap-2 text-[13px] font-medium rounded-lg px-3 py-2 transition-colors',
                                                isActive
                                                    ? 'bg-black/10 dark:bg-white/10 text-current font-semibold'
                                                    : 'text-current/90 hover:text-current hover:bg-black/5 dark:hover:bg-white/5',
                                            )}
                                        >
                                            {path.icon}
                                            {path.name}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-black/10 dark:border-white/10 pt-2 pb-3">
                    <StorageIndicator />
                </div>
            </div>
        </>
    )
}
