export const FILE_SIZE = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
} as const

export const FILE_LIMITS = {
    WORKSPACE_IMAGE: 5 * FILE_SIZE.MB,
} as const

// Para mostrar al usuario: "5 MB"
export function formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'

    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
}
