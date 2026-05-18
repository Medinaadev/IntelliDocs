import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { WorkspaceMembersService } from './workspace-members.service';
import {
    JwtUser,
    JwtUserType,
    UseJwt,
} from 'src/auth/decorators/jwt.decorator';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { InviteMemberDto } from './dto/invite-member.dto';

@UseJwt()
@Controller('workspaces/:workspaceId/members')
export class WorkspaceMembersController {
    constructor(
        private readonly workspaceMembersService: WorkspaceMembersService,
    ) {}

    @Post('update-last-active')
    async updateLastActive(
        @JwtUser() user: JwtUserType,
        @Param('workspaceId') workspaceId: string,
    ) {
        try {
            await this.workspaceMembersService.updateLastActive(
                workspaceId,
                user.id,
            );
            return { ok: true };
        } catch (error) {
            console.error('Error al actualizar la última actividad:', error);
            throw error;
        }
    }

    @UseGuards(JwtGuard, WorkspaceMemberGuard)
    @Get()
    getMembers(@Param('workspaceId') workspaceId: string) {
        return this.workspaceMembersService.getWorkspaceMembers(workspaceId);
    }

    @UseGuards(JwtGuard, WorkspaceMemberGuard)
    @Delete(':userId')
    removeMember(
        @Param('workspaceId') workspaceId: string,
        @Param('userId') targetUserId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspaceMembersService.removeMember(
            workspaceId,
            targetUserId,
            user.id,
        );
    }

    // Invitaciones

    @UseGuards(JwtGuard, WorkspaceMemberGuard)
    @Get('invitations')
    getInvitations(@Param('workspaceId') workspaceId: string) {
        return this.workspaceMembersService.getInvitations(workspaceId);
    }

    @UseGuards(JwtGuard, WorkspaceMemberGuard)
    @Post('invitations')
    inviteMember(
        @Param('workspaceId') workspaceId: string,
        @Body() dto: InviteMemberDto,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspaceMembersService.inviteMember(
            workspaceId,
            dto.email,
            user.id,
        );
    }

    @UseGuards(JwtGuard, WorkspaceMemberGuard)
    @Delete('invitations/:invitationId')
    cancelInvitation(
        @Param('workspaceId') workspaceId: string,
        @Param('invitationId') invitationId: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.workspaceMembersService.cancelInvitation(
            workspaceId,
            invitationId,
            user.id,
        );
    }
}
