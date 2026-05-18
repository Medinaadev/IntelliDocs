import { cn } from '#/lib/utils'
import { Badge } from '../ui/badge'

const PLAN_CONFIG: Record<string, { label: string; className: string }> = {
    free: {
        label: 'Gratis',
        className: 'bg-black/6 dark:bg-white/8 text-muted-foreground border-black/10 dark:border-white/10',
    },
    pro: {
        label: 'Pro',
        className: 'bg-amber-400/15 text-amber-700 dark:text-amber-400 border-amber-400/30',
    },
    business: {
        label: 'Business',
        className: 'bg-amber-400/15 text-amber-700 dark:text-amber-400 border-amber-400/30',
    },
    enterprise: {
        label: 'Empresa',
        className: 'bg-violet-500/12 text-violet-700 dark:text-violet-400 border-violet-500/30',
    },
}

export const WorkspaceBadge = ({ plan }: { plan: string }) => {
    const config = PLAN_CONFIG[plan] ?? { label: plan, className: 'bg-black/6 dark:bg-white/8 text-muted-foreground border-black/10 dark:border-white/10' }
    return (
        <Badge
            variant="outline"
            className={cn('text-[10px] font-semibold uppercase tracking-wider', config.className)}
        >
            {config.label}
        </Badge>
    )
}
