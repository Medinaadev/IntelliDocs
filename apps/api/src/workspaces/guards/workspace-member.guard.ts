import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { WorkspaceMembersService } from '../members/workspace-members.service';
import { JwtRequest } from 'src/auth/guards/jwt.guard';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
    constructor(
        private readonly workspaceMembersService: WorkspaceMembersService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<JwtRequest>();

        if (!request.user) {
            throw new UnauthorizedException('No autenticado');
        }

        const userId = request.user.id;
        const workspaceId = request.params.workspaceId;

        if (!workspaceId) {
            throw new UnauthorizedException('ID de workspace requerido');
        }

        if (!userId) {
            throw new UnauthorizedException('ID de usuario requerido');
        }

        const isMember = await this.workspaceMembersService.isMember(
            workspaceId as string,
            userId,
        );

        if (!isMember) {
            throw new ForbiddenException('No perteneces a este workspace');
        }

        return true;
    }
}
