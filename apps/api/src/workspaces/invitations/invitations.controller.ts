import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { WorkspaceMembersService } from '../members/workspace-members.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { JwtUser, JwtUserType } from 'src/auth/decorators/jwt.decorator';

/**
 * Endpoints públicos para invitaciones.
 * GET  /invitations/:token  — sin autenticación (muestra la info de la invitación)
 * POST /invitations/:token/accept — requiere JWT (necesita saber quién acepta)
 */
@Controller('invitations')
export class InvitationsController {
    constructor(private readonly membersService: WorkspaceMembersService) {}

    @Get(':token')
    getInvitationInfo(@Param('token') token: string) {
        return this.membersService.getInvitationInfo(token);
    }

    @UseGuards(JwtGuard)
    @Post(':token/accept')
    acceptInvitation(
        @Param('token') token: string,
        @JwtUser() user: JwtUserType,
    ) {
        return this.membersService.acceptInvitation(token, user.id);
    }
}
