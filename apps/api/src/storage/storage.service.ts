import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    CreateBucketCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { days } from '@nestjs/throttler';

@Injectable()
export class StorageService implements OnModuleInit {
    private readonly logger = new Logger(StorageService.name);
    private readonly s3Client: S3Client;
    private readonly bucket: string;
    private readonly cdnUrl: string;

    constructor(private configService: ConfigService) {
        this.s3Client = new S3Client({
            endpoint: this.configService.get('S3_ENDPOINT') as string,
            region:
                (this.configService.get('S3_REGION') as string) || 'us-east-1', // MinIO no requiere región, pero Cloudflare R2 sí
            credentials: {
                accessKeyId: this.configService.get('S3_ACCESS_KEY') as string,
                secretAccessKey: this.configService.get(
                    'S3_SECRET_KEY',
                ) as string,
            },
            forcePathStyle: true, // Necesario para MinIO
        });

        this.bucket = this.configService.get('S3_BUCKET') as string;

        this.logger.debug(
            `Initialized S3 client with endpoint ${this.configService.get(
                'S3_ENDPOINT',
            )} and bucket ${this.bucket}`,
        );
    }

    async onModuleInit() {
        try {
            // Verificar si el bucket existe
            await this.s3Client.send(
                new HeadBucketCommand({
                    Bucket: this.bucket,
                }),
            );

            this.logger.log(`Bucket "${this.bucket}" already exists`);
        } catch (error) {
            if (error.$metadata?.httpStatusCode === 404) {
                // Bucket no existe, crearlo
                this.logger.log(
                    `Bucket "${this.bucket}" does not exist, creating...`,
                );

                await this.s3Client.send(
                    new CreateBucketCommand({
                        Bucket: this.bucket,
                    }),
                );

                this.logger.log(`Bucket "${this.bucket}" created successfully`);
            } else {
                this.logger.error(`Error checking bucket: ${error.message}`);
                throw error;
            }
        }
    }

    /**
     * Sube un archivo a S3
     */
    async uploadFile(
        file: Express.Multer.File,
        workspaceId: string,
        folder: 'images' | 'files' = 'images',
    ): Promise<{ storageKey: string; size: number }> {
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${randomUUID()}.${fileExtension}`;
        const storageKey = `workspaces/${workspaceId}/${folder}/${fileName}`;

        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: storageKey,
                Body: file.buffer,
                ContentType: file.mimetype,
            }),
        );

        return { storageKey, size: file.size };
    }

    /**
     * Genera una URL pre-firmada para descargar un archivo desde S3
     */
    async getPresignedUrl(storageKey: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: storageKey,
        });

        // La URL será válida por 7 días
        return await getSignedUrl(this.s3Client, command, {
            expiresIn: days(7) / 1000, // Convertir días a segundos
        });
    }

    /**
     * Descarga el contenido de un archivo de S3 como Buffer
     */
    async downloadBuffer(storageKey: string): Promise<Buffer> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: storageKey,
        })
        const response = await this.s3Client.send(command)
        const stream = response.Body as NodeJS.ReadableStream
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = []
            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
            stream.on('end', () => resolve(Buffer.concat(chunks)))
            stream.on('error', reject)
        })
    }

    /**
     * Elimina un archivo de S3
     */
    async deleteFile(storageKey: string): Promise<void> {
        await this.s3Client.send(
            new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: storageKey,
            }),
        );
    }
}
