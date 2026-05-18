import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma.service';
import {
    FILE_PROCESSING_QUEUE,
    FileProcessingJobPayload,
} from './processing.constants';

@Injectable()
export class ProcessingService {
    constructor(
        @InjectQueue(FILE_PROCESSING_QUEUE) private readonly queue: Queue,
        private readonly prisma: PrismaService,
    ) {}

    /**
     * Encola un job de procesamiento para un archivo recién subido.
     */
    async enqueueFileProcessing(
        payload: FileProcessingJobPayload,
    ): Promise<void> {
        await this.queue.add('process-file', payload, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });
    }

    /**
     * Devuelve el estado de procesamiento de los últimos 30 archivos del workspace.
     */
    async getWorkspaceProcessingStatus(workspaceId: string) {
        const files = await this.prisma.file.findMany({
            where: { workspaceId, trashedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 30,
            select: {
                id: true,
                name: true,
                mimeType: true,
                status: true,
                createdAt: true,
                content: {
                    select: {
                        pageCount: true,
                        wordCount: true,
                        language: true,
                        extractedAt: true,
                        extractError: true,
                        metadata: true,
                    },
                },
                activeVersion: {
                    select: { checksum: true },
                },
            },
        });

        return { items: files };
    }
}
