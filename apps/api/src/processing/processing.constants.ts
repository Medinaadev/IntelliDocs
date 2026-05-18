export const FILE_PROCESSING_QUEUE = 'file-processing';

export type FileProcessingJobPayload = {
    fileId: string;
    workspaceId: string;
    storageKey: string;
    mimeType: string;
    versionId: string;
};
