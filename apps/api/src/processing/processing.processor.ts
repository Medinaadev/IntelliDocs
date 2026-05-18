import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { createHash } from 'crypto';
import pdfParse from 'pdf-parse';
import sharp from 'sharp';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { StorageService } from 'src/storage/storage.service';
import {
    FILE_PROCESSING_QUEUE,
    FileProcessingJobPayload,
} from './processing.constants';

@Processor(FILE_PROCESSING_QUEUE)
export class ProcessingProcessor extends WorkerHost {
    private readonly logger = new Logger(ProcessingProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
    ) {
        super();
    }

    async process(job: Job<FileProcessingJobPayload>): Promise<void> {
        const { fileId, storageKey, mimeType, versionId } = job.data;

        try {
            // Marcar el archivo como "en procesamiento"
            await this.prisma.file.update({
                where: { id: fileId },
                data: { status: 'processing' },
            });

            // Descargar el buffer del archivo desde S3/MinIO
            const buffer: Buffer =
                await this.storage.downloadBuffer(storageKey);

            // Calcular el hash SHA-256 del archivo
            const hash = createHash('sha256').update(buffer).digest('hex');
            await this.prisma.fileVersion.update({
                where: { id: versionId },
                data: { checksum: hash },
            });

            // Variables para el contenido extraído
            let extractedText: string | null = null;
            let pageCount: number | null = null;
            let wordCount: number | null = null;
            let metadata: Prisma.InputJsonObject | null = null;

            if (mimeType === 'application/pdf') {
                // Procesar PDF: extraer texto, número de páginas y palabras
                const result = await pdfParse(buffer);
                extractedText = result.text?.trim() || null;
                pageCount = result.numpages || null;
                wordCount = extractedText
                    ? extractedText.split(/\s+/).filter(Boolean).length
                    : null;
                metadata = {
                    title: result.info?.Title || null,
                    author: result.info?.Author || null,
                };
                this.logger.log(
                    `PDF procesado — fileId=${fileId}, páginas=${pageCount}, palabras=${wordCount}`,
                );
            } else if (mimeType.startsWith('image/')) {
                // Procesar imagen: obtener dimensiones y metadatos con sharp
                const meta = await sharp(buffer).metadata();
                metadata = {
                    width: meta.width,
                    height: meta.height,
                    format: meta.format,
                    space: meta.space,
                };
                this.logger.log(
                    `Imagen procesada — fileId=${fileId}, ${meta.width}x${meta.height}`,
                );
            }

            // Guardar el contenido extraído en FileContent
            await this.prisma.fileContent.upsert({
                where: { fileId },
                create: {
                    fileId,
                    extractedText,
                    pageCount,
                    wordCount,
                    ...(metadata !== null ? { metadata } : {}),
                    extractedAt: new Date(),
                },
                update: {
                    extractedText,
                    pageCount,
                    wordCount,
                    ...(metadata !== null ? { metadata } : {}),
                    extractedAt: new Date(),
                    extractError: null,
                },
            });

            // Actualizar el vector de búsqueda full-text si hay texto extraído
            if (extractedText) {
                await this.prisma.$executeRaw`
                    UPDATE "FileContent"
                    SET "searchVector" = to_tsvector('spanish', ${extractedText}),
                        "indexedAt" = NOW()
                    WHERE "fileId" = ${fileId}
                `;
            }

            // Marcar el archivo como listo
            await this.prisma.file.update({
                where: { id: fileId },
                data: { status: 'ready' },
            });

            this.logger.log(`Procesamiento completado — fileId=${fileId}`);
        } catch (error: any) {
            this.logger.error(
                `Error procesando archivo fileId=${fileId}: ${error.message}`,
                error.stack,
            );

            // Marcar el archivo como error y guardar el mensaje
            await this.prisma.file
                .update({
                    where: { id: fileId },
                    data: { status: 'error' },
                })
                .catch(() => {});

            await this.prisma.fileContent
                .upsert({
                    where: { fileId },
                    create: { fileId, extractError: error.message },
                    update: { extractError: error.message },
                })
                .catch(() => {});

            // Re-lanzar el error para que BullMQ marque el job como fallido
            throw error;
        }
    }
}
