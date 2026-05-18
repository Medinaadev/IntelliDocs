import {
    Body,
    Controller,
    Delete,
    Get,
    Logger,
    Param,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from 'src/prisma.service';
import { WorkspacesService } from '../workspaces.service';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { JwtUser, JwtUserType } from 'src/auth/decorators/jwt.decorator';
import { GetDriveQueryDto } from '../dto/drive-query.dto';
import { CreateFolderDto } from '../dto/create-folder.dto';
import { UpdateFolderDto } from '../dto/update-folder.dto';
import { UpdateFileDto } from '../dto/update-file.dto';
import { GetBreadcrumbsDto } from '../dto/get-breadcrumbs.dto';
import { UploadFileDto } from '../dto/upload-file.dto';

@UseGuards(JwtGuard, WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId/drive')
export class WorkspaceDriveController {
    private readonly logger = new Logger(WorkspaceDriveController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly workspacesService: WorkspacesService,
    ) {}

    @Get()
    getDrive(
        @Param('workspaceId') workspaceId: string,
        @Query() query: GetDriveQueryDto,
    ) {
        return this.workspacesService.getDriveContent(workspaceId, query);
    }

    @Post('folders')
    createFolder(
        @Param('workspaceId') workspaceId: string,
        @Body() dto: CreateFolderDto,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.createFolder(workspaceId, dto, user.id);
    }

    @Patch('folders/:folderId')
    updateFolder(
        @Param('workspaceId') workspaceId: string,
        @Param('folderId') folderId: string,
        @Body() dto: UpdateFolderDto,
    ) {
        return this.workspacesService.updateFolder(workspaceId, folderId, dto);
    }

    @Delete('folders/:folderId')
    trashFolder(
        @Param('workspaceId') workspaceId: string,
        @Param('folderId') folderId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.trashFolder(
            workspaceId,
            folderId,
            user.id,
        );
    }

    @Post('files')
    @UseInterceptors(FileInterceptor('file'))
    uploadFile(
        @Param('workspaceId') workspaceId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: UploadFileDto,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.uploadDriveFile(
            workspaceId,
            dto,
            file,
            user.id,
        );
    }

    @Patch('files/:fileId')
    updateFile(
        @Param('workspaceId') workspaceId: string,
        @Param('fileId') fileId: string,
        @Body() dto: UpdateFileDto,
    ) {
        return this.workspacesService.updateFile(workspaceId, fileId, dto);
    }

    @Delete('files/:fileId')
    trashFile(
        @Param('workspaceId') workspaceId: string,
        @Param('fileId') fileId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.trashFile(workspaceId, fileId, user.id);
    }

    @Post('files/:fileId/versions')
    @UseInterceptors(FileInterceptor('file'))
    uploadNewVersion(
        @Param('workspaceId') workspaceId: string,
        @Param('fileId') fileId: string,
        @UploadedFile() file: Express.Multer.File,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.uploadNewFileVersion(
            workspaceId,
            fileId,
            file,
            user.id,
        );
    }

    @Get('items/:itemType/:itemId/properties')
    getItemProperties(
        @Param('workspaceId') workspaceId: string,
        @Param('itemType') itemType: 'folder' | 'file',
        @Param('itemId') itemId: string,
    ) {
        return this.workspacesService.getDriveItemProperties(
            workspaceId,
            itemType,
            itemId,
        );
    }

    @Get('files/:fileId/download')
    getFileDownloadUrl(
        @Param('workspaceId') workspaceId: string,
        @Param('fileId') fileId: string,
    ) {
        return this.workspacesService.getFileDownloadUrl(workspaceId, fileId);
    }

    @Get('files/:fileId/versions')
    getFileVersions(
        @Param('workspaceId') workspaceId: string,
        @Param('fileId') fileId: string,
    ) {
        return this.workspacesService.getFileVersions(workspaceId, fileId);
    }

    @Get('files/:fileId/versions/:versionId/download')
    getVersionDownloadUrl(
        @Param('workspaceId') workspaceId: string,
        @Param('fileId') fileId: string,
        @Param('versionId') versionId: string,
    ) {
        return this.workspacesService.getFileVersionDownloadUrl(
            workspaceId,
            fileId,
            versionId,
        );
    }

    @Get('breadcrumbs')
    async getBreadcrumbs(
        @Param('workspaceId') workspaceId: string,
        @Query() query: GetBreadcrumbsDto,
    ) {
        return this.workspacesService.getDriveBreadcrumbs(
            workspaceId,
            query.folderId,
        );
    }

    // trash

    @Get('trash')
    getTrashedItems(@Param('workspaceId') workspaceId: string) {
        return this.workspacesService.getTrashedItems(workspaceId);
    }

    @Patch('trash/folders/:folderId/restore')
    restoreFolder(
        @Param('workspaceId') workspaceId: string,
        @Param('folderId') folderId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.restoreFolder(workspaceId, folderId, user.id);
    }

    @Patch('trash/files/:fileId/restore')
    restoreFile(
        @Param('workspaceId') workspaceId: string,
        @Param('fileId') fileId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.restoreFile(workspaceId, fileId, user.id);
    }

    @Delete('trash/folders/:folderId')
    permanentlyDeleteFolder(
        @Param('workspaceId') workspaceId: string,
        @Param('folderId') folderId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.permanentlyDeleteFolder(
            workspaceId,
            folderId,
            user.id,
        );
    }

    @Delete('trash/files/:fileId')
    permanentlyDeleteFile(
        @Param('workspaceId') workspaceId: string,
        @Param('fileId') fileId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspacesService.permanentlyDeleteFile(
            workspaceId,
            fileId,
            user.id,
        );
    }

    @Delete('trash')
    emptyTrash(@Param('workspaceId') workspaceId: string) {
        return this.workspacesService.emptyTrash(workspaceId);
    }
}
