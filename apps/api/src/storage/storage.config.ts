export const STORAGE_CONFIG = {
    // Limites para imágenes de workspace
    workspaceImage: {
        maxSize: 5 * 1024 * 1024, // 5 MB
        allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
        ],
    },

    // Limites para archivos
    file: {
        maxSize: 100 * 1024 * 1024, // 100 MB
        allowedMimeTypes: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
            'image/jpeg',
            'image/png',
        ],
    },
};
