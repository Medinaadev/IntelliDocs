import { ClientWorkspaceData, DriveBreadcrumbItem } from '@intellidocs/types';
import { AuditAction, Prisma } from '@prisma/client';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { WorkspaceMembersService } from './members/workspace-members.service';
import { StorageService } from 'src/storage/storage.service';
import { GetDriveQueryDto } from './dto/drive-query.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { AssignTagDto } from './dto/assign-tag.dto';
import { ProcessingService } from 'src/processing/processing.service';

@Injectable()
export class WorkspacesService {
    private readonly logger = new Logger(WorkspacesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly workspaceMembersService: WorkspaceMembersService,
        private readonly storage: StorageService,
        private readonly processingService: ProcessingService,
    ) {}

    async getFreeWorkspacesCount(userId: string): Promise<number> {
        const count = await this.prisma.workspaceMember.count({
            where: {
                userId,
                workspace: {
                    plan: 'free',
                },
            },
        });

        return count;
    }

    async createWorkspace(userId: string, name: string, image?: string) {
        const workspace = await this.prisma.workspace.create({
            data: {
                name,
                image,
                members: {
                    create: {
                        userId,
                        isOwner: true,
                    },
                },
            },
        });

        workspace.image = workspace.image
            ? await this.storage.getPresignedUrl(workspace.image)
            : null;

        return workspace;
    }

    private async getStorageUsed(workspaceId: string): Promise<number> {
        const result = await this.prisma.file.aggregate({
            where: { workspaceId, trashedAt: null },
            _sum: { size: true },
        });
        return Number(result._sum.size ?? 0);
    }

    async getById(workspaceId: string): Promise<ClientWorkspaceData> {
        const [workspace, storageUsed] = await Promise.all([
            this.prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: {
                    id: true,
                    name: true,
                    image: true,
                    plan: true,
                    seatsLimit: true,
                    storageLimit: true,
                },
            }),
            this.getStorageUsed(workspaceId),
        ]);

        if (!workspace) {
            throw new Error('Workspace not found');
        }

        return {
            id: workspace.id,
            name: workspace.name,
            image: workspace.image
                ? await this.storage.getPresignedUrl(workspace.image)
                : null,
            plan: workspace.plan,
            seatsLimit: workspace.seatsLimit,
            storageLimit: workspace.storageLimit,
            storageUsed,
        };
    }

    async getWorkspacesByUserId(
        userId: string,
        options?: { memberCount?: boolean; lastActiveAt?: boolean },
    ): Promise<ClientWorkspaceData[]> {
        const results = await this.prisma.workspaceMember.findMany({
            select: {
                lastActiveAt: options?.lastActiveAt ? true : false,
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        plan: true,
                        seatsLimit: true,
                        storageLimit: true,
                        _count: options?.memberCount
                            ? { select: { members: true } }
                            : false,
                    },
                },
            },
            where: {
                userId,
            },
        });

        return await Promise.all(
            results.map(async (result) => {
                const workspace = result.workspace;
                const [image, storageUsed] = await Promise.all([
                    workspace.image
                        ? this.storage.getPresignedUrl(workspace.image)
                        : Promise.resolve(null),
                    this.getStorageUsed(workspace.id),
                ]);

                return {
                    id: workspace.id,
                    name: workspace.name,
                    image,
                    plan: workspace.plan,
                    seatsLimit: workspace.seatsLimit,
                    storageLimit: workspace.storageLimit,
                    storageUsed,
                    memberCount: options?.memberCount
                        ? workspace._count.members
                        : undefined,
                    lastActiveAt: options?.lastActiveAt
                        ? result.lastActiveAt
                        : undefined,
                };
            }),
        );
    }

    async uploadImage(
        workspaceId: string,
        file: Express.Multer.File,
        userId: string,
    ): Promise<{ storageKey: string; imageUrl: string }> {
        const member = await this.prisma.workspaceMember.findFirst({
            where: {
                workspaceId,
                userId,
            },
        });

        if (!member) {
            throw new ForbiddenException(
                'No eres miembro de este workspace',
            );
        }

        if (!member.isOwner) {
            throw new ForbiddenException(
                'Solo el propietario puede actualizar la imagen del workspace',
            );
        }

        // Subir nueva imagen
        const { storageKey } = await this.storage.uploadFile(
            file,
            workspaceId,
            'images',
        );

        // Si ya había una imagen anterior, eliminarla
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { image: true },
        });

        if (workspace?.image) {
            await this.storage.deleteFile(workspace.image);
        }

        // Actualizar el registro del workspace con la nueva imagen
        await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { image: storageKey },
        });

        // Devolver un objeto en lugar de un string
        const imageUrl = await this.storage.getPresignedUrl(storageKey);

        return {
            storageKey,
            imageUrl,
        };
    }

    async getDriveContent(workspaceId: string, query: GetDriveQueryDto) {
        const parentId = query.parentId ?? null;
        const limit = query.limit ?? 50;
        const q = query.q?.trim() || null;
        const tagId = query.tagId?.trim() || null;

        // When filtering by tag we don't need a parentId check
        if (!q && !tagId && parentId) {
            const parentFolder = await this.prisma.folder.findUnique({
                where: { id: parentId, workspaceId, trashedAt: null },
                select: { id: true },
            });

            if (!parentFolder) {
                throw new NotFoundException(
                    'Parent folder not found in this workspace',
                );
            }
        }

        const nameFilter = q
            ? { contains: q, mode: 'insensitive' as const }
            : undefined;

        const userSelect = {
            id: true,
            name: true,
            image: true,
        };

        const fileSelect = {
            id: true,
            name: true,
            folderId: true,
            mimeType: true,
            size: true,
            createdAt: true,
            updatedAt: true,
            uploadedBy: { select: userSelect },
            _count: { select: { versions: true } },
            tags: {
                select: {
                    tag: {
                        select: {
                            id: true,
                            name: true,
                            color: true,
                        },
                    },
                },
            },
        };

        // Tag filter: workspace-wide files with that tag (no folders)
        if (tagId) {
            const files = await this.prisma.file.findMany({
                where: {
                    workspaceId,
                    trashedAt: null,
                    tags: { some: { tagId } },
                    ...(nameFilter ? { name: nameFilter } : {}),
                },
                select: fileSelect,
                orderBy: { name: 'asc' },
                take: limit,
            });

            return {
                parentId,
                items: files.map((file) => ({
                    type: 'file' as const,
                    id: file.id,
                    name: file.name,
                    parentId: file.folderId,
                    mimeType: file.mimeType,
                    size: file.size?.toString() ?? null,
                    uploadedBy: (file as any).uploadedBy,
                    versionNumber: (file as any)._count?.versions ?? 1,
                    tags: (file as any).tags?.map((ft: any) => ft.tag) ?? [],
                    createdAt: file.createdAt,
                    updatedAt: file.updatedAt,
                })),
                hasMore: files.length === limit,
            };
        }

        const [folders, files] = await Promise.all([
            this.prisma.folder.findMany({
                where: {
                    workspaceId,
                    trashedAt: null,
                    // Al buscar ignoramos parentId para buscar en todo el workspace
                    ...(q ? {} : { parentId }),
                    ...(nameFilter ? { name: nameFilter } : {}),
                },
                select: {
                    id: true,
                    name: true,
                    color: true,
                    parentId: true,
                    createdAt: true,
                    updatedAt: true,
                    createdBy: { select: userSelect },
                },
                orderBy: { name: 'asc' },
                take: limit,
            }),
            q
                ? this.prisma.file.findMany({
                      where: {
                          workspaceId,
                          trashedAt: null,
                          // Buscar en nombre Y en texto extraído del contenido
                          OR: [
                              { name: { contains: q, mode: 'insensitive' } },
                              {
                                  content: {
                                      extractedText: {
                                          contains: q,
                                          mode: 'insensitive',
                                      },
                                  },
                              },
                          ],
                      },
                      select: fileSelect,
                      orderBy: { name: 'asc' },
                      take: limit,
                  })
                : parentId
                  ? this.prisma.file.findMany({
                        where: {
                            workspaceId,
                            folderId: parentId,
                            trashedAt: null,
                        },
                        select: fileSelect,
                        orderBy: { name: 'asc' },
                        take: limit,
                    })
                  : Promise.resolve([]),
        ]);

        const items = [
            ...folders.map((folder) => ({
                type: 'folder' as const,
                id: folder.id,
                name: folder.name,
                color: folder.color,
                parentId: folder.parentId,
                createdBy: folder.createdBy ?? null,
                createdAt: folder.createdAt,
                updatedAt: folder.updatedAt,
            })),
            ...files.map((file) => ({
                type: 'file' as const,
                id: file.id,
                name: file.name,
                parentId: file.folderId,
                mimeType: file.mimeType,
                size: file.size?.toString() ?? null,
                uploadedBy: (file as any).uploadedBy,
                versionNumber: (file as any)._count?.versions ?? 1,
                tags: (file as any).tags?.map((ft: any) => ft.tag) ?? [],
                createdAt: file.createdAt,
                updatedAt: file.updatedAt,
            })),
        ];

        return {
            parentId,
            items,
            hasMore: folders.length === limit || files.length === limit, // Si se devuelve exactamente el límite, es posible que haya más items
        };
    }

    async createFolder(
        workspaceId: string,
        dto: CreateFolderDto,
        userId?: string,
    ) {
        const name = dto.name.trim();
        const parentId = dto.parentId ?? null;
        const color = dto.color?.trim() || null;

        if (!name) {
            throw new BadRequestException('El nombre de la carpeta es obligatorio');
        }

        if (parentId) {
            const parentFolder = await this.prisma.folder.findUnique({
                where: { id: parentId, workspaceId, trashedAt: null },
                select: { id: true },
            });

            if (!parentFolder) {
                throw new NotFoundException(
                    'Parent folder not found in this workspace',
                );
            }
        }

        const existingFolder = await this.prisma.folder.findFirst({
            where: {
                workspaceId,
                parentId,
                name,
                trashedAt: null,
            },
        });

        if (existingFolder) {
            throw new ConflictException(
                'A folder with the same name already exists in this location',
            );
        }

        const folder = await this.prisma.folder.create({
            data: {
                name,
                workspaceId,
                parentId,
                color,
                createdById: userId ?? null,
            },
            include: {
                createdBy: { select: { id: true, name: true, image: true } },
            },
        });

        if (userId) {
            await this.log(
                workspaceId,
                userId,
                AuditAction.folder_created,
                'folder',
                folder.id,
                folder.name,
            );
        }

        return {
            id: folder.id,
            name: folder.name,
            parentId: folder.parentId,
            color: folder.color,
            createdBy: folder.createdBy ?? null,
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt,
        };
    }

    async uploadDriveFile(
        workspaceId: string,
        dto: UploadFileDto,
        file: Express.Multer.File,
        userId: string,
    ) {
        const folderId = dto.folderId ?? null;

        if (folderId) {
            const folder = await this.prisma.folder.findUnique({
                where: { id: folderId, workspaceId, trashedAt: null },
                select: { id: true },
            });
            if (!folder) throw new NotFoundException('Carpeta no encontrada');
        }

        const { storageKey, size } = await this.storage.uploadFile(
            file,
            workspaceId,
            'files',
        );

        const extension = file.originalname.split('.').pop() ?? '';

        const fileRecord = await this.prisma.$transaction(async (tx) => {
            const created = await tx.file.create({
                data: {
                    name: file.originalname,
                    workspaceId,
                    folderId: folderId!,
                    uploadedById: userId,
                    mimeType: file.mimetype,
                    size: BigInt(size),
                    extension,
                    storageKey,
                    status: 'uploading',
                },
            });

            const version = await tx.fileVersion.create({
                data: {
                    fileId: created.id,
                    versionNumber: 1,
                    storageKey,
                    mimeType: file.mimetype,
                    size: BigInt(size),
                    extension,
                    uploadedById: userId,
                },
            });

            return tx.file.update({
                where: { id: created.id },
                data: { activeVersionId: version.id, status: 'uploading' },
            });
        });

        await this.log(
            workspaceId,
            userId,
            AuditAction.file_uploaded,
            'file',
            fileRecord.id,
            fileRecord.name,
        );

        // Encolar procesamiento asíncrono del archivo (checksum, extracción de texto, etc.)
        await this.processingService.enqueueFileProcessing({
            fileId: fileRecord.id,
            workspaceId,
            storageKey,
            mimeType: file.mimetype,
            versionId: fileRecord.activeVersionId!,
        });

        return {
            id: fileRecord.id,
            name: fileRecord.name,
            folderId: fileRecord.folderId,
            mimeType: fileRecord.mimeType,
            size: fileRecord.size?.toString() ?? null,
            createdAt: fileRecord.createdAt,
            updatedAt: fileRecord.updatedAt,
        };
    }

    async getDriveBreadcrumbs(workspaceId: string, folderId?: string) {
        if (!folderId) {
            return {
                items: [
                    {
                        id: null,
                        name: 'Drive',
                    },
                ],
            };
        }

        const items: DriveBreadcrumbItem[] = [];
        let currentId: string | null = folderId;

        while (currentId) {
            const folder = (await this.prisma.folder.findUnique({
                where: { id: currentId, workspaceId, trashedAt: null },
                select: { id: true, name: true, parentId: true },
            })) as { id: string; name: string; parentId: string | null } | null;

            if (!folder) {
                throw new NotFoundException(
                    'Folder not found in this workspace',
                );
            }

            items.push({
                id: folder.id,
                name: folder.name,
            });

            currentId = folder.parentId;
        }

        items.push({
            id: null,
            name: 'Drive',
        });

        items.reverse(); // Invertir el orden para que vaya de la raíz a la carpeta actual
        return { items };
    }

    async updateFolder(
        workspaceId: string,
        folderId: string,
        dto: UpdateFolderDto,
    ) {
        const folder = await this.prisma.folder.findUnique({
            where: { id: folderId, workspaceId, trashedAt: null },
        });
        if (!folder) throw new NotFoundException('Carpeta no encontrada');

        if (dto.name) {
            const name = dto.name.trim();
            const conflict = await this.prisma.folder.findFirst({
                where: {
                    workspaceId,
                    parentId: folder.parentId,
                    name,
                    trashedAt: null,
                    id: { not: folderId },
                },
            });
            if (conflict)
                throw new ConflictException(
                    'A folder with this name already exists here',
                );
        }

        const updated = await this.prisma.folder.update({
            where: { id: folderId },
            data: {
                ...(dto.name ? { name: dto.name.trim() } : {}),
                ...(dto.color !== undefined ? { color: dto.color } : {}),
            },
            include: {
                createdBy: { select: { id: true, name: true, image: true } },
            },
        });

        return {
            id: updated.id,
            name: updated.name,
            color: updated.color,
            parentId: updated.parentId,
            createdBy: updated.createdBy ?? null,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }

    async updateFile(workspaceId: string, fileId: string, dto: UpdateFileDto) {
        const file = await this.prisma.file.findUnique({
            where: { id: fileId, workspaceId, trashedAt: null },
        });
        if (!file) throw new NotFoundException('Archivo no encontrado');

        if (dto.name) {
            const name = dto.name.trim();
            const conflict = await this.prisma.file.findFirst({
                where: {
                    workspaceId,
                    folderId: file.folderId,
                    name,
                    trashedAt: null,
                    id: { not: fileId },
                },
            });
            if (conflict)
                throw new ConflictException(
                    'A file with this name already exists here',
                );
        }

        const updated = await this.prisma.file.update({
            where: { id: fileId },
            data: { ...(dto.name ? { name: dto.name.trim() } : {}) },
            include: {
                uploadedBy: { select: { id: true, name: true, image: true } },
            },
        });

        return {
            id: updated.id,
            name: updated.name,
            parentId: updated.folderId,
            mimeType: updated.mimeType,
            size: updated.size?.toString() ?? null,
            uploadedBy: updated.uploadedBy,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }

    async trashFolder(workspaceId: string, folderId: string, userId: string) {
        const folder = await this.prisma.folder.findUnique({
            where: { id: folderId, workspaceId, trashedAt: null },
        });
        if (!folder) throw new NotFoundException('Carpeta no encontrada');

        await this.prisma.folder.update({
            where: { id: folderId },
            data: { trashedAt: new Date(), trashedById: userId },
        });

        await this.log(
            workspaceId,
            userId,
            AuditAction.folder_deleted,
            'folder',
            folderId,
            folder.name,
        );
        return { success: true };
    }

    async trashFile(workspaceId: string, fileId: string, userId: string) {
        const file = await this.prisma.file.findUnique({
            where: { id: fileId, workspaceId, trashedAt: null },
        });
        if (!file) throw new NotFoundException('Archivo no encontrado');

        await this.prisma.file.update({
            where: { id: fileId },
            data: { trashedAt: new Date(), trashedById: userId },
        });

        await this.log(
            workspaceId,
            userId,
            AuditAction.file_deleted,
            'file',
            fileId,
            file.name,
        );
        return { success: true };
    }

    // trash management

    async getTrashedItems(workspaceId: string) {
        const userSelect = { id: true, name: true, image: true };

        const [folders, files] = await Promise.all([
            this.prisma.folder.findMany({
                where: { workspaceId, trashedAt: { not: null } },
                select: {
                    id: true,
                    name: true,
                    color: true,
                    parentId: true,
                    trashedAt: true,
                    trashedById: true,
                },
                orderBy: { trashedAt: 'desc' },
            }),
            this.prisma.file.findMany({
                where: { workspaceId, trashedAt: { not: null } },
                select: {
                    id: true,
                    name: true,
                    folderId: true,
                    mimeType: true,
                    size: true,
                    trashedAt: true,
                    trashedById: true,
                },
                orderBy: { trashedAt: 'desc' },
            }),
        ]);

        const userIds = [
            ...new Set(
                [
                    ...folders.map((f) => f.trashedById),
                    ...files.map((f) => f.trashedById),
                ].filter(Boolean) as string[],
            ),
        ];

        const users =
            userIds.length > 0
                ? await this.prisma.user.findMany({
                      where: { id: { in: userIds } },
                      select: userSelect,
                  })
                : [];

        const userMap = new Map(users.map((u) => [u.id, u]));

        const resolveUser = async (id: string | null) => {
            if (!id) return null;
            const u = userMap.get(id);
            if (!u) return null;
            return {
                id: u.id,
                name: u.name,
                image: u.image
                    ? await this.storage.getPresignedUrl(u.image)
                    : null,
            };
        };

        const [foldersResolved, filesResolved] = await Promise.all([
            Promise.all(
                folders.map(async (f) => ({
                    type: 'folder' as const,
                    id: f.id,
                    name: f.name,
                    color: f.color,
                    parentId: f.parentId,
                    trashedAt: f.trashedAt!,
                    trashedBy: await resolveUser(f.trashedById),
                })),
            ),
            Promise.all(
                files.map(async (f) => ({
                    type: 'file' as const,
                    id: f.id,
                    name: f.name,
                    folderId: f.folderId,
                    mimeType: f.mimeType,
                    size: f.size?.toString() ?? null,
                    trashedAt: f.trashedAt!,
                    trashedBy: await resolveUser(f.trashedById),
                })),
            ),
        ]);

        return {
            folders: foldersResolved,
            files: filesResolved,
            totalCount: folders.length + files.length,
        };
    }

    async restoreFolder(workspaceId: string, folderId: string, userId: string) {
        const folder = await this.prisma.folder.findUnique({
            where: { id: folderId, workspaceId },
        });
        if (!folder) throw new NotFoundException('Carpeta no encontrada');
        if (!folder.trashedAt)
            throw new BadRequestException('La carpeta no está en la papelera');

        await this.prisma.folder.update({
            where: { id: folderId },
            data: { trashedAt: null, trashedById: null },
        });

        await this.log(
            workspaceId,
            userId,
            AuditAction.folder_restored,
            'folder',
            folderId,
            folder.name,
        );
        return { success: true };
    }

    async restoreFile(workspaceId: string, fileId: string, userId: string) {
        const file = await this.prisma.file.findUnique({
            where: { id: fileId, workspaceId },
        });
        if (!file) throw new NotFoundException('Archivo no encontrado');
        if (!file.trashedAt)
            throw new BadRequestException('El archivo no está en la papelera');

        await this.prisma.file.update({
            where: { id: fileId },
            data: { trashedAt: null, trashedById: null },
        });

        await this.log(
            workspaceId,
            userId,
            AuditAction.file_restored,
            'file',
            fileId,
            file.name,
        );
        return { success: true };
    }

    async permanentlyDeleteFolder(
        workspaceId: string,
        folderId: string,
        userId: string,
    ) {
        const folder = await this.prisma.folder.findUnique({
            where: { id: folderId, workspaceId },
        });
        if (!folder) throw new NotFoundException('Carpeta no encontrada');
        if (!folder.trashedAt)
            throw new BadRequestException(
                'La carpeta debe estar en la papelera antes de eliminarla definitivamente',
            );

        // Guardar nombre antes de borrar para el log
        const folderName = folder.name;
        await this.prisma.folder.delete({ where: { id: folderId } });
        await this.log(
            workspaceId,
            userId,
            AuditAction.folder_deleted,
            'folder',
            folderId,
            folderName,
        );
        return { success: true };
    }

    async permanentlyDeleteFile(
        workspaceId: string,
        fileId: string,
        userId: string,
    ) {
        const file = await this.prisma.file.findUnique({
            where: { id: fileId, workspaceId },
            include: { versions: { select: { storageKey: true } } },
        });
        if (!file) throw new NotFoundException('Archivo no encontrado');
        if (!file.trashedAt)
            throw new BadRequestException(
                'El archivo debe estar en la papelera antes de eliminarlo definitivamente',
            );

        // Eliminar todos los objetos de storage y luego el registro DB
        await Promise.all(
            (file as any).versions.map((v: { storageKey: string }) =>
                this.storage.deleteFile(v.storageKey).catch(() => null),
            ),
        );
        const fileName = file.name;
        await this.prisma.file.delete({ where: { id: fileId } });
        await this.log(
            workspaceId,
            userId,
            AuditAction.file_deleted,
            'file',
            fileId,
            fileName,
        );
        return { success: true };
    }

    async emptyTrash(workspaceId: string) {
        const [folders, files] = await Promise.all([
            this.prisma.folder.findMany({
                where: { workspaceId, trashedAt: { not: null } },
                select: { id: true },
            }),
            this.prisma.file.findMany({
                where: { workspaceId, trashedAt: { not: null } },
                include: { versions: { select: { storageKey: true } } },
            }),
        ]);

        // Delete storage objects for all trashed files
        await Promise.all(
            (files as any[]).flatMap((f) =>
                f.versions.map((v: { storageKey: string }) =>
                    this.storage.deleteFile(v.storageKey).catch(() => null),
                ),
            ),
        );

        await Promise.all([
            this.prisma.folder.deleteMany({
                where: { id: { in: folders.map((f) => f.id) } },
            }),
            this.prisma.file.deleteMany({
                where: { id: { in: files.map((f) => f.id) } },
            }),
        ]);

        return { deleted: folders.length + files.length };
    }

    async uploadNewFileVersion(
        workspaceId: string,
        fileId: string,
        file: Express.Multer.File,
        userId: string,
    ) {
        const existing = await this.prisma.file.findUnique({
            where: { id: fileId, workspaceId, trashedAt: null },
            include: {
                versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
            },
        });
        if (!existing) throw new NotFoundException('Archivo no encontrado');

        const { storageKey, size } = await this.storage.uploadFile(
            file,
            workspaceId,
            'files',
        );
        const nextVersion = (existing.versions[0]?.versionNumber ?? 0) + 1;
        const extension = file.originalname.split('.').pop() ?? '';

        const updated = await this.prisma.$transaction(async (tx) => {
            const version = await tx.fileVersion.create({
                data: {
                    fileId,
                    versionNumber: nextVersion,
                    storageKey,
                    mimeType: file.mimetype,
                    size: BigInt(size),
                    extension,
                    uploadedById: userId,
                },
            });

            return tx.file.update({
                where: { id: fileId },
                data: {
                    activeVersionId: version.id,
                    storageKey,
                    mimeType: file.mimetype,
                    size: BigInt(size),
                    extension,
                    name: file.originalname,
                },
                include: {
                    uploadedBy: {
                        select: { id: true, name: true, image: true },
                    },
                },
            });
        });

        return {
            id: updated.id,
            name: updated.name,
            parentId: updated.folderId,
            mimeType: updated.mimeType,
            size: updated.size?.toString() ?? null,
            uploadedBy: updated.uploadedBy,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }

    async getDriveItemProperties(
        workspaceId: string,
        itemType: 'folder' | 'file',
        itemId: string,
    ) {
        if (itemType === 'folder') {
            const folder = await this.prisma.folder.findUnique({
                where: { id: itemId, workspaceId, trashedAt: null },
                include: {
                    createdBy: {
                        select: { id: true, name: true, image: true },
                    },
                    _count: { select: { files: true, children: true } },
                },
            });
            if (!folder) throw new NotFoundException('Carpeta no encontrada');
            return {
                type: 'folder' as const,
                id: folder.id,
                name: folder.name,
                color: folder.color,
                parentId: folder.parentId,
                createdBy: folder.createdBy ?? null,
                itemCount: folder._count.files + folder._count.children,
                createdAt: folder.createdAt,
                updatedAt: folder.updatedAt,
            };
        }

        const file = await this.prisma.file.findUnique({
            where: { id: itemId, workspaceId, trashedAt: null },
            include: {
                uploadedBy: { select: { id: true, name: true, image: true } },
                _count: { select: { versions: true } },
            },
        });
        if (!file) throw new NotFoundException('Archivo no encontrado');
        return {
            type: 'file' as const,
            id: file.id,
            name: file.name,
            parentId: file.folderId,
            mimeType: file.mimeType,
            size: file.size?.toString() ?? null,
            extension: file.extension,
            uploadedBy: file.uploadedBy,
            versionCount: file._count.versions,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
        };
    }

    async getFileVersions(workspaceId: string, fileId: string) {
        const file = await this.prisma.file.findUnique({
            where: { id: fileId, workspaceId, trashedAt: null },
            select: { id: true, name: true, activeVersionId: true },
        });
        if (!file) throw new NotFoundException('Archivo no encontrado');

        const versions = await this.prisma.fileVersion.findMany({
            where: { fileId },
            select: {
                id: true,
                versionNumber: true,
                mimeType: true,
                size: true,
                extension: true,
                label: true,
                comment: true,
                createdAt: true,
                uploadedBy: { select: { id: true, name: true, image: true } },
            },
            orderBy: { versionNumber: 'desc' },
        });

        return {
            fileId: file.id,
            fileName: file.name,
            activeVersionId: file.activeVersionId,
            versions: versions.map((v) => ({
                id: v.id,
                versionNumber: v.versionNumber,
                mimeType: v.mimeType,
                size: v.size?.toString() ?? null,
                extension: v.extension,
                label: v.label,
                comment: v.comment,
                isActive: v.id === file.activeVersionId,
                uploadedBy: v.uploadedBy,
                createdAt: v.createdAt,
            })),
        };
    }

    async getFileDownloadUrl(workspaceId: string, fileId: string) {
        const file = await this.prisma.file.findFirst({
            where: { id: fileId, workspaceId, trashedAt: null },
            select: {
                name: true,
                mimeType: true,
                activeVersion: { select: { storageKey: true } },
            },
        });
        if (!file || !file.activeVersion)
            throw new NotFoundException('Archivo no encontrado');

        const url = await this.storage.getPresignedUrl(
            file.activeVersion.storageKey,
        );
        return { url, filename: file.name, mimeType: file.mimeType };
    }

    async getFileVersionDownloadUrl(
        workspaceId: string,
        fileId: string,
        versionId: string,
    ) {
        const version = await this.prisma.fileVersion.findFirst({
            where: { id: versionId, fileId, file: { workspaceId } },
            select: { id: true, storageKey: true, versionNumber: true },
        });
        if (!version) throw new NotFoundException('Versión no encontrada');

        const url = await this.storage.getPresignedUrl(version.storageKey);
        return { url, versionNumber: version.versionNumber };
    }

    async getWorkspaceTags(workspaceId: string) {
        const tags = await this.prisma.tag.findMany({
            where: { workspaceId },
            include: { _count: { select: { files: true } } },
            orderBy: { name: 'asc' },
        });
        return tags.map((t) => ({
            id: t.id,
            name: t.name,
            color: t.color,
            fileCount: t._count.files,
            createdAt: t.createdAt,
        }));
    }

    async createTag(workspaceId: string, dto: CreateTagDto) {
        const name = dto.name.trim();
        const existing = await this.prisma.tag.findUnique({
            where: { workspaceId_name: { workspaceId, name } },
        });
        if (existing)
            throw new ConflictException('Ya existe una etiqueta con ese nombre');
        const tag = await this.prisma.tag.create({
            data: { workspaceId, name, color: dto.color ?? null },
        });
        return {
            id: tag.id,
            name: tag.name,
            color: tag.color,
            fileCount: 0,
            createdAt: tag.createdAt,
        };
    }

    async updateTag(workspaceId: string, tagId: string, dto: UpdateTagDto) {
        const tag = await this.prisma.tag.findUnique({
            where: { id: tagId, workspaceId },
        });
        if (!tag) throw new NotFoundException('Etiqueta no encontrada');
        if (dto.name) {
            const name = dto.name.trim();
            const conflict = await this.prisma.tag.findFirst({
                where: { workspaceId, name, id: { not: tagId } },
            });
            if (conflict)
                throw new ConflictException(
                    'Ya existe una etiqueta con ese nombre',
                );
        }
        const updated = await this.prisma.tag.update({
            where: { id: tagId },
            data: {
                ...(dto.name ? { name: dto.name.trim() } : {}),
                ...(dto.color !== undefined ? { color: dto.color } : {}),
            },
            include: { _count: { select: { files: true } } },
        });
        return {
            id: updated.id,
            name: updated.name,
            color: updated.color,
            fileCount: updated._count.files,
            createdAt: updated.createdAt,
        };
    }

    async deleteTag(workspaceId: string, tagId: string) {
        const tag = await this.prisma.tag.findUnique({
            where: { id: tagId, workspaceId },
        });
        if (!tag) throw new NotFoundException('Etiqueta no encontrada');
        await this.prisma.tag.delete({ where: { id: tagId } });
        return { success: true };
    }

    async getTagFiles(workspaceId: string, tagId: string) {
        const tag = await this.prisma.tag.findUnique({
            where: { id: tagId, workspaceId },
        });
        if (!tag) throw new NotFoundException('Etiqueta no encontrada');
        const fileTags = await this.prisma.fileTag.findMany({
            where: { tagId },
            include: {
                file: {
                    select: {
                        id: true,
                        name: true,
                        mimeType: true,
                        size: true,
                        folderId: true,
                        createdAt: true,
                        updatedAt: true,
                        uploadedBy: {
                            select: { id: true, name: true, image: true },
                        },
                        _count: { select: { versions: true } },
                    },
                },
            },
        });
        return {
            tag: { id: tag.id, name: tag.name, color: tag.color },
            files: fileTags.map(({ file }) => ({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                size: file.size?.toString() ?? null,
                folderId: file.folderId,
                versionNumber: file._count.versions,
                uploadedBy: file.uploadedBy,
                createdAt: file.createdAt,
                updatedAt: file.updatedAt,
            })),
        };
    }

    async assignTagToFile(
        workspaceId: string,
        fileId: string,
        dto: AssignTagDto,
    ) {
        const file = await this.prisma.file.findUnique({
            where: { id: fileId, workspaceId, trashedAt: null },
        });
        if (!file) throw new NotFoundException('Archivo no encontrado');
        const tag = await this.prisma.tag.findUnique({
            where: { id: dto.tagId, workspaceId },
        });
        if (!tag) throw new NotFoundException('Etiqueta no encontrada');
        await this.prisma.fileTag.upsert({
            where: { fileId_tagId: { fileId, tagId: dto.tagId } },
            create: { fileId, tagId: dto.tagId },
            update: {},
        });
        return { success: true };
    }

    async removeTagFromFile(
        workspaceId: string,
        fileId: string,
        tagId: string,
    ) {
        const fileTag = await this.prisma.fileTag.findUnique({
            where: { fileId_tagId: { fileId, tagId } },
        });
        if (!fileTag)
            throw new NotFoundException('Esta etiqueta no está asignada al archivo');
        await this.prisma.fileTag.delete({
            where: { fileId_tagId: { fileId, tagId } },
        });
        return { success: true };
    }

    async getFileTags(workspaceId: string, fileId: string) {
        const file = await this.prisma.file.findUnique({
            where: { id: fileId, workspaceId, trashedAt: null },
        });
        if (!file) throw new NotFoundException('Archivo no encontrado');
        const fileTags = await this.prisma.fileTag.findMany({
            where: { fileId },
            include: { tag: { select: { id: true, name: true, color: true } } },
        });
        return fileTags.map((ft) => ft.tag);
    }

    async getWorkspaceOverview(workspaceId: string) {
        const userSelect = { id: true, name: true, image: true };

        const [
            fileCount,
            folderCount,
            memberCount,
            tagCount,
            storageResult,
            workspace,
            recentFiles,
            topTags,
        ] = await Promise.all([
            this.prisma.file.count({ where: { workspaceId, trashedAt: null } }),
            this.prisma.folder.count({
                where: { workspaceId, trashedAt: null },
            }),
            this.prisma.workspaceMember.count({ where: { workspaceId } }),
            this.prisma.tag.count({ where: { workspaceId } }),
            this.prisma.file.aggregate({
                where: { workspaceId, trashedAt: null },
                _sum: { size: true },
            }),
            this.prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: { storageLimit: true, plan: true },
            }),
            this.prisma.file.findMany({
                where: { workspaceId, trashedAt: null },
                select: {
                    id: true,
                    name: true,
                    mimeType: true,
                    size: true,
                    folderId: true,
                    updatedAt: true,
                    uploadedBy: { select: userSelect },
                    _count: { select: { versions: true } },
                    tags: {
                        select: {
                            tag: {
                                select: { id: true, name: true, color: true },
                            },
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                take: 8,
            }),
            this.prisma.tag.findMany({
                where: { workspaceId },
                select: {
                    id: true,
                    name: true,
                    color: true,
                    _count: { select: { files: true } },
                },
                orderBy: { files: { _count: 'desc' } },
                take: 10,
            }),
        ]);

        const storageUsed = Number(storageResult._sum.size ?? 0);

        const recentFilesResolved = await Promise.all(
            recentFiles.map(async (file) => {
                const uploader = (file as any).uploadedBy;
                return {
                    id: file.id,
                    name: file.name,
                    mimeType: file.mimeType,
                    size: file.size?.toString() ?? null,
                    folderId: file.folderId,
                    updatedAt: file.updatedAt,
                    versionNumber: (file as any)._count?.versions ?? 1,
                    tags: (file as any).tags?.map((ft: any) => ft.tag) ?? [],
                    uploadedBy: uploader
                        ? {
                              id: uploader.id,
                              name: uploader.name,
                              image: uploader.image
                                  ? await this.storage.getPresignedUrl(
                                        uploader.image,
                                    )
                                  : null,
                          }
                        : null,
                };
            }),
        );

        return {
            fileCount,
            folderCount,
            memberCount,
            tagCount,
            storageUsed,
            storageLimit: (workspace?.storageLimit ?? 0) * 1024 * 1024 * 1024,
            plan: workspace?.plan ?? 'free',
            recentFiles: recentFilesResolved,
            topTags: topTags.map((t) => ({
                id: t.id,
                name: t.name,
                color: t.color,
                fileCount: (t as any)._count.files,
            })),
        };
    }

    // Configuración

    async renameWorkspace(
        workspaceId: string,
        name: string,
        userId: string,
    ): Promise<{ success: boolean }> {
        const member = await this.prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
        if (!member?.isOwner)
            throw new ForbiddenException(
                'Solo el propietario puede renombrar el workspace',
            );

        await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { name: name.trim() },
        });
        return { success: true };
    }

    async deleteWorkspace(
        workspaceId: string,
        userId: string,
    ): Promise<{ success: boolean }> {
        const member = await this.prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
        if (!member?.isOwner)
            throw new ForbiddenException(
                'Solo el propietario puede eliminar el workspace',
            );

        // Eliminar todos los archivos del storage antes de borrar el workspace
        const files = await this.prisma.file.findMany({
            where: { workspaceId },
            select: { storageKey: true },
        });
        await Promise.allSettled(
            files
                .filter((f) => f.storageKey)
                .map((f) => this.storage.deleteFile(f.storageKey!)),
        );

        // Eliminar la imagen del workspace si existe
        const ws = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { image: true },
        });
        if (ws?.image) await this.storage.deleteFile(ws.image).catch(() => {});

        // El resto (carpetas, miembros, invitaciones) se borra en cascada
        await this.prisma.workspace.delete({ where: { id: workspaceId } });
        return { success: true };
    }

    async leaveWorkspace(
        workspaceId: string,
        userId: string,
    ): Promise<{ success: boolean }> {
        const member = await this.prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
        if (!member)
            throw new NotFoundException('No eres miembro de este workspace');
        if (member.isOwner)
            throw new ForbiddenException(
                'El propietario no puede abandonar el workspace. Elimínalo o transfiere la propiedad.',
            );

        await this.prisma.workspaceMember.delete({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
        return { success: true };
    }

    // Actividad / Auditoría

    /**
     * Registra una acción en el log de auditoría del workspace.
     * Falla silenciosamente para no interrumpir la operación principal.
     */
    private async log(
        workspaceId: string,
        userId: string,
        action: AuditAction,
        entityType: 'file' | 'folder',
        entityId: string,
        entityName?: string,
        metadata?: Prisma.InputJsonObject,
    ) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    workspaceId,
                    userId,
                    action,
                    entityType,
                    entityId,
                    entityName,
                    ...(metadata !== undefined ? { metadata } : {}),
                },
            });
        } catch (err) {
            this.logger.warn(
                `No se pudo registrar acción de auditoría: ${err}`,
            );
        }
    }

    async getActivity(workspaceId: string, limit = 50, cursor?: string) {
        const logs = await this.prisma.auditLog.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            select: {
                id: true,
                action: true,
                entityType: true,
                entityId: true,
                entityName: true,
                metadata: true,
                createdAt: true,
                user: {
                    select: { id: true, name: true, image: true },
                },
            },
        });

        const hasMore = logs.length > limit;
        const items = hasMore ? logs.slice(0, limit) : logs;

        // Resolver URLs presignadas de las imágenes de usuario
        const resolved = await Promise.all(
            items.map(async (log) => ({
                ...log,
                user: {
                    ...log.user,
                    image: log.user.image
                        ? await this.storage.getPresignedUrl(log.user.image)
                        : null,
                },
            })),
        );

        return {
            items: resolved,
            nextCursor: hasMore ? items[items.length - 1].id : null,
        };
    }
}
