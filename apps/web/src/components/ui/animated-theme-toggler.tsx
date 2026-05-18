import { useCallback, useRef } from 'react'
import { Moon, Sun } from 'lucide-react'
import { flushSync } from 'react-dom'

import { cn } from '#/lib/utils'
import { useThemeStore } from '#/stores/themeStore'

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<'button'> {
    duration?: number
    size?: number
}

export const AnimatedThemeToggler = ({
    className,
    duration = 400,
    size = 24,
    ...props
}: AnimatedThemeTogglerProps) => {
    const buttonRef = useRef<HTMLButtonElement>(null)
    const { theme, applyTheme } = useThemeStore()
    const isDark = theme === 'dark'

    const toggleTheme = useCallback(() => {
        const button = buttonRef.current
        if (!button) return

        const { top, left, width, height } = button.getBoundingClientRect()
        const x = left + width / 2
        const y = top + height / 2
        const viewportWidth = window.visualViewport?.width ?? window.innerWidth
        const viewportHeight =
            window.visualViewport?.height ?? window.innerHeight
        const maxRadius = Math.hypot(
            Math.max(x, viewportWidth - x),
            Math.max(y, viewportHeight - y),
        )

        if (typeof document.startViewTransition !== 'function') {
            applyTheme(isDark ? 'light' : 'dark')
            return
        }

        const transition = document.startViewTransition(() => {
            flushSync(() => applyTheme(isDark ? 'light' : 'dark'))
        })

        const ready = transition.ready
        if (typeof ready.then === 'function') {
            ready.then(() => {
                document.documentElement.animate(
                    {
                        clipPath: [
                            `circle(0px at ${x}px ${y}px)`,
                            `circle(${maxRadius}px at ${x}px ${y}px)`,
                        ],
                    },
                    {
                        duration,
                        easing: 'ease-in-out',
                        pseudoElement: '::view-transition-new(root)',
                    },
                )
            })
        }
    }, [isDark, duration])

    return (
        <button
            type="button"
            ref={buttonRef}
            onClick={toggleTheme}
            className={cn(className)}
            {...props}
        >
            {isDark ? <Sun size={size} /> : <Moon size={size} />}
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
