const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export type ApiFetchError = {
    message: string
}

// Función helper para hacer fetch con autenticación
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    // Solo añadir Content-Type si no es FormData
    const isFormData = options.body instanceof FormData

    const headers: Record<string, string> = {
        ...(typeof options.headers === 'object'
            ? (options.headers as Record<string, string>)
            : {}),
    }

    // Añadir Content-Type solo si no es FormData
    if (!isFormData && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
    }

    // IMPORTANTE: Incluir credentials para enviar cookies al backend
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // Enviar cookies (incluyendo HttpOnly)
    })

    if (!response.ok) {
        // devolver el error del backend si es posible
        let errorMessage = 'Error en la solicitud'
        try {
            const errorData = await response.json()
            errorMessage = errorData.message || errorMessage
        } catch (e) {
            // No se pudo parsear el error, usar mensaje genérico
        }
        throw new Error(errorMessage)
    }

    return response.json()
}

// Métodos HTTP
export const api = {
    get: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: 'GET' }),

    post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
        apiFetch<T>(endpoint, {
            method: 'POST',
            body:
                data instanceof FormData
                    ? data
                    : data
                      ? JSON.stringify(data)
                      : undefined,
            ...options,
        }),

    put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
        apiFetch<T>(endpoint, {
            method: 'PUT',
            body:
                data instanceof FormData
                    ? data
                    : data
                      ? JSON.stringify(data)
                      : undefined,
            ...options,
        }),

    patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
        apiFetch<T>(endpoint, {
            method: 'PATCH',
            body:
                data instanceof FormData
                    ? data
                    : data
                      ? JSON.stringify(data)
                      : undefined,
            ...options,
        }),

    delete: <T>(endpoint: string, options?: RequestInit) =>
        apiFetch<T>(endpoint, { method: 'DELETE', ...options }),
}

export const getApiUrl = (path: string = '') => `${API_URL}${path}`
