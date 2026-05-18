import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { WorkspaceMemberGuard } from 'src/workspaces/guards/workspace-member.guard';
import { ProcessingService } from './processing.service';

@UseGuards(JwtGuard, WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId/processing')
export class ProcessingController {
    constructor(private readonly processingService: ProcessingService) {}

    @Get()
    getStatus(@Param('workspaceId') workspaceId: string) {
        return this.processingService.getWorkspaceProcessingStatus(workspaceId);
    }
}
