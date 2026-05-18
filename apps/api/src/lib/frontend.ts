export const getFrontendUrl = (path: string = ''): string => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${baseUrl}${path}`;
};
