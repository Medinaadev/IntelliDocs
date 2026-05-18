import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { WorkspacesService } from '../workspaces.service';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { CreateTagDto } from '../dto/create-tag.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';
import { AssignTagDto } from '../dto/assign-tag.dto';

@UseGuards(JwtGuard, WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId')
export class WorkspaceTagsController {
    constructor(private readonly workspacesService: WorkspacesService) {}

    @Get('tags')
    getTags(@Param('workspaceId') workspaceId: string) {
        return this.workspacesService.getWorkspaceTags(workspaceId);
    }

    @Post('tags')
    createTag(
        @Param('workspaceId') workspaceId: string,
        @Body() dto: CreateTagDto,
    ) {
        return this.workspacesService.createTag(workspaceId, dto);
    }

    @Patch('tags/:tagId')
    updateTag(
        @Param('workspaceId') workspaceId: string,
        @Param('tagId') tagId: string,
        @Body() dto: UpdateTagDto,
    ) {
        return this.workspacesService.updateTag(workspaceId, tagId, dto);
    }

    @Delete('tags/:tagId')
    deleteTag(
        @Param('workspaceId') workspaceId: string,
        @Param('tagId') tagId: string,
    ) {
        return this.workspacesService.deleteTag(workspaceId, tagId);
    }

    @Get('tags/:tagId/files')
    getTagFiles(
        @Param('workspaceId') workspaceId: string,
        @Param('tagId') tagId: string,
    ) {
        return this.workspacesService.getTagFiles(workspaceId, tagId);
    }

    @Get('drive/files/:fileId/tags')
    getFileTags(
        @Param('workspaceId') workspaceId: string,
        @Param('fileId') fileId: string,
    ) {
        return this.workspacesService.getFileTags(workspaceId, fileId);
    }

    @Post('drive/files/:fileId/tags')
    assignTag(
        @Param('workspaceId') workspaceId: string,
        @Param('fileId') fileId: string,
        @Body() dto: AssignTagDto,
    ) {
        return this.workspacesService.assignTagToFile(workspaceId, fileId, dto);
    }

    @Delete('drive/files/:fileId/tags/:tagId')
    removeTag(
        @Param('workspaceId') workspaceId: string,
        @Param('fileId') fileId: string,
        @Param('tagId') tagId: string,
    ) {
        return this.workspacesService.removeTagFromFile(
            workspaceId,
            fileId,
            tagId,
        );
    }
}
