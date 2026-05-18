import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from './ui/sonner'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { StoreInitializer } from '#/stores/StoreInitializer'
import { TooltipProvider } from './ui/tooltip'

const queryClient = new QueryClient()

export const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                <StoreInitializer />
                {children}
                <TanStackDevtools
                    config={{
                        position: 'bottom-right',
                    }}
                    plugins={[
                        {
                            name: 'TanStack Router',
                            render: <TanStackRouterDevtoolsPanel />,
                        },
                    ]}
                />
            </TooltipProvider>
        </QueryClientProvider>
    )
}
