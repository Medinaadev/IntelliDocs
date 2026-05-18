import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
    theme: 'light' | 'dark' | null
    toggleTheme: () => void
    setTheme: (theme: 'light' | 'dark') => void
    applyTheme: (theme: 'light' | 'dark') => void
    initTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: null,
            toggleTheme: () =>
                set((state) => {
                    const newTheme = state.theme === 'light' ? 'dark' : 'light'
                    return { theme: newTheme }
                }),
            setTheme: (theme: 'light' | 'dark') => {
                set({ theme })
            },
            applyTheme: (theme: 'light' | 'dark') => {
                document.documentElement.classList.toggle(
                    'dark',
                    theme === 'dark',
                )
                get().setTheme(theme)
            },
            initTheme: () => {
                const storedTheme = get().theme

                if (storedTheme) {
                    get().applyTheme(storedTheme)
                } else {
                    const prefersDark = window.matchMedia(
                        '(prefers-color-scheme: dark)',
                    ).matches
                    get().applyTheme(prefersDark ? 'dark' : 'light')
                }
            },
        }),
        {
            name: 'theme', // nombre de la clave en localStorage
            partialize: (state) => ({ theme: state.theme }), // solo persistir el tema
        },
    ),
)
