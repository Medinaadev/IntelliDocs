import { useWorkspaceStore } from '#/stores/workspaceStore'
import { overviewQuery } from '#/lib/queries/overview'
import { useQuery } from '@tanstack/react-query'
import { formatFileSize } from '#/lib/file-size'

export function StorageIndicator() {
    const workspace = useWorkspaceStore((s) => s.workspace)
    if (!workspace) return null

    // usa la overview query que ya esta en cache del dashboard
    // se invalida sola cuando se mueven o restauran archivos
    const { data: overview } = useQuery({
        ...overviewQuery(workspace.id),
        // no hacer fetch solo por montar el sidebar, usamos lo que hay en cache
        staleTime: 30_000,
    })

    const usedBytes = overview?.storageUsed ?? workspace.storageUsed ?? 0
    // overview.storageLimit viene en bytes, workspace.storageLimit del store viene en GB (legacy)
    const limitBytes = overview
        ? overview.storageLimit
        : (workspace.storageLimit ?? 1) * 1024 * 1024 * 1024

    const pct = limitBytes > 0 ? Math.min(usedBytes / limitBytes, 1) : 0

    // circulo svg de progreso
    const r = 14
    const circumference = 2 * Math.PI * r
    const offset = circumference * (1 - pct)

    const color =
        pct >= 0.9
            ? 'text-red-400 dark:text-red-400'
            : pct >= 0.7
              ? 'text-yellow-400 dark:text-yellow-400'
              : 'text-primary'

    return (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div className="relative shrink-0 size-9">
                <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
                    {/* pista de fondo del circulo */}
                    <circle
                        cx="18"
                        cy="18"
                        r={r}
                        fill="none"
                        strokeWidth="3"
                        className="stroke-black/10 dark:stroke-white/10"
                    />
                    {/* arco que se va llenando segun el uso */}
                    <circle
                        cx="18"
                        cy="18"
                        r={r}
                        fill="none"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className={`stroke-current transition-all duration-500 ${color}`}
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums">
                    {Math.round(pct * 100)}%
                </span>
            </div>

            <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-medium">Almacenamiento</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {formatFileSize(usedBytes)} de {formatFileSize(limitBytes)}
                </span>
            </div>
        </div>
    )
}
