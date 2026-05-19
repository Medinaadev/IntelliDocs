import { api } from '#/lib/api'
import { create } from 'zustand'

export interface UserSession {
    id: string
    email: string
    name: string
    image?: string
}

export interface Session {
    user: UserSession
    expiresAt: string
}

interface AuthSessionResponse {
    user: UserSession
    expiresAt: string
}

interface LoginOptions {
    email?: string
    password?: string
    redirectUri?: string
}

type Provider = 'credentials' | 'google'

interface AuthStore {
    initialized: boolean
    session: Session | null
    isLoading: boolean
    scheduleTimeoutId?: NodeJS.Timeout
    setInitialized: (initialized: boolean) => void
    setSession: (session: Session | null) => void
    checkSession: () => Promise<void>
    awaitSessionCheck: () => Promise<void>
    refreshSession: () => Promise<void>
    scheduleSessionRefresh: () => void
    isAuthenticated: () => boolean
    login: (
        provider: Provider,
        options?: LoginOptions,
    ) => Promise<{ success: boolean; error?: string }>
    logout: () => Promise<void>
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

export const useAuthStore = create<AuthStore>((set, get) => ({
    initialized: false,
    session: null,
    isLoading: true,
    setInitialized: (initialized) => set({ initialized }),
    setSession: (session) => set({ session }),
    checkSession: async () => {
        try {
            const response = await api.get<AuthSessionResponse>('/auth/session')
            set({
                session: {
                    user: response.user,
                    expiresAt: response.expiresAt,
                },
            })
        } catch (error) {
            console.error('Error checking session:', error)
            set({ session: null })
        } finally {
            set({ isLoading: false })
        }
    },

    awaitSessionCheck: () => {
        return new Promise<void>((resolve) => {
            const check = () => {
                const { isLoading } = get()
                if (!isLoading) {
                    resolve()
                } else {
                    setTimeout(check, 100)
                }
            }
            check()
        })
    },

    refreshSession: async () => {
        try {
            const response =
                await api.post<AuthSessionResponse>('/auth/refresh')
            set({
                session: {
                    user: response.user,
                    expiresAt: response.expiresAt,
                },
            })
        } catch (error) {
            console.error('Error refreshing session:', error)
            set({ session: null })
        }
    },

    scheduleSessionRefresh: () => {
        const { session } = get()
        if (!session) return

        if (get().scheduleTimeoutId) {
            clearTimeout(get().scheduleTimeoutId)
        }

        const expiresAt = new Date(session.expiresAt).getTime()
        const now = Date.now()
        const timeout = expiresAt - now - 60 * 1000 // Refresh 1 minute before expiration

        if (timeout > 0) {
            const timeoutId = setTimeout(() => {
                get().refreshSession()
            }, timeout)
            set({ scheduleTimeoutId: timeoutId })
        }
    },

    isAuthenticated: () => {
        const { session } = get()
        return !!session
    },

    login: async (provider, options) => {
        const { email, password, redirectUri } = options || {}

        if (get().isLoading) {
            await get().awaitSessionCheck()
        }

        if (get().isAuthenticated()) {
            return { success: true }
        }

        set({ isLoading: true })

        try {
            if (provider === 'credentials' && (!email || !password)) {
                return {
                    success: false,
                    error: 'Email y contraseña son obligatorios',
                }
            }

            let response: AuthSessionResponse

            if (provider === 'credentials') {
                response = await api.post<AuthSessionResponse>(`/auth/login`, {
                    email,
                    password,
                    redirectUri,
                })
            } else {
                let endpoint = `/auth/login/${provider}`
                if (redirectUri) {
                    endpoint += `?redirectUri=${encodeURIComponent(redirectUri)}`
                }

                window.location.href = `${BACKEND_URL}${endpoint}`
                return { success: true }
            }

            set({
                session: {
                    user: response.user,
                    expiresAt: response.expiresAt,
                },
            })
            window.location.href = redirectUri || '/workspaces'
            return { success: true }
        } catch (error) {
            console.error('Error during login:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        } finally {
            set({ isLoading: false })
        }
    },

    logout: async () => {
        try {
            await api.post('/auth/logout')
            window.location.href = '/'
        } catch (error) {
            console.error('Error logout:', error)
        } finally {
            set({
                session: null,
            })
        }
    },
}))

export const initializeAuthStore = async () => {
    if (useAuthStore.getState().initialized) return
    useAuthStore.getState().setInitialized(true)
    await useAuthStore.getState().checkSession()
}
