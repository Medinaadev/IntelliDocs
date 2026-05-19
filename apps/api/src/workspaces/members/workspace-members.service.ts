import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ResendService } from 'src/resend.service';
import { getFrontendUrl } from 'src/lib/frontend';
import { StorageService } from 'src/storage/storage.service';

const INVITATION_EXPIRES_HOURS = 72;

@Injectable()
export class WorkspaceMembersService {
    private readonly logger = new Logger(WorkspaceMembersService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly resend: ResendService,
        private readonly storage: StorageService,
    ) {}

    async isMember(workspaceId: string, userId: string) {
        return await this.prisma.workspaceMember
            .count({ where: { workspaceId, userId } })
            .then(Boolean);
    }

    async countMembers(workspaceId: string): Promise<number> {
        return this.prisma.workspaceMember.count({ where: { workspaceId } });
    }

    async getWorkspaceMembers(workspaceId: string) {
        const members = await this.prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return Promise.all(
            members.map(async (m) => ({
                id: m.id,
                isOwner: m.isOwner,
                lastActiveAt: m.lastActiveAt,
                joinedAt: m.createdAt,
                user: {
                    id: m.user.id,
                    name: m.user.name,
                    email: m.user.email,
                    image: m.user.image
                        ? await this.storage.getPresignedUrl(m.user.image)
                        : null,
                },
            })),
        );
    }

    async getMemberIds(workspaceId: string): Promise<string[]> {
        const members = await this.prisma.workspaceMember.findMany({
            where: { workspaceId },
            select: { userId: true },
        });
        return members.map((m) => m.userId);
    }

    async updateLastActive(workspaceId: string, userId: string): Promise<void> {
        const result = await this.prisma.workspaceMember.updateMany({
            where: { workspaceId, userId },
            data: { lastActiveAt: new Date() },
        });
        if (result.count === 0) throw new Error('Workspace member not found');
    }

    async removeMember(
        workspaceId: string,
        targetUserId: string,
        requesterId: string,
    ) {
        // Cannot remove yourself — use leave instead
        if (targetUserId === requesterId)
            throw new BadRequestException('No puedes eliminarte a ti mismo');

        const requester = await this.prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: requesterId } },
        });
        if (!requester?.isOwner)
            throw new ForbiddenException(
                'Solo el propietario puede eliminar miembros',
            );

        const target = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: { workspaceId, userId: targetUserId },
            },
        });
        if (!target) throw new NotFoundException('El miembro no existe');
        if (target.isOwner)
            throw new ForbiddenException('No puedes eliminar al propietario');

        await this.prisma.workspaceMember.delete({
            where: {
                workspaceId_userId: { workspaceId, userId: targetUserId },
            },
        });
        return { success: true };
    }

    // Invitaciones

    getInvitations(workspaceId: string) {
        return this.prisma.workspaceInvitation.findMany({
            where: { workspaceId, status: 'pending' },
            select: {
                id: true,
                email: true,
                status: true,
                expiresAt: true,
                createdAt: true,
                invitedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async inviteMember(workspaceId: string, email: string, inviterId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { name: true, seatsLimit: true },
        });
        if (!workspace) throw new NotFoundException('Workspace no encontrado');

        const memberCount = await this.countMembers(workspaceId);
        if (memberCount >= workspace.seatsLimit)
            throw new ForbiddenException(
                `Has alcanzado el límite de ${workspace.seatsLimit} miembros`,
            );

        const existingUser = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser) {
            const alreadyMember = await this.isMember(
                workspaceId,
                existingUser.id,
            );
            if (alreadyMember)
                throw new ConflictException(
                    'Este usuario ya es miembro del workspace',
                );
        }

        const expiresAt = new Date(
            Date.now() + INVITATION_EXPIRES_HOURS * 60 * 60 * 1000,
        );

        const existing = await this.prisma.workspaceInvitation.findUnique({
            where: { workspaceId_email: { workspaceId, email } },
        });

        const invitation = existing
            ? await this.prisma.workspaceInvitation.update({
                  where: { id: existing.id },
                  data: {
                      status: 'pending',
                      expiresAt,
                      invitedById: inviterId,
                      token: crypto.randomUUID(),
                  },
              })
            : await this.prisma.workspaceInvitation.create({
                  data: {
                      email,
                      workspaceId,
                      invitedById: inviterId,
                      expiresAt,
                  },
              });

        const inviter = await this.prisma.user.findUnique({
            where: { id: inviterId },
            select: { name: true },
        });

        const inviteUrl = getFrontendUrl(`/invitations/${invitation.token}`);

        const { error: emailError } = await this.resend.emails.send({
            template: {
                id: 'workspace-invitation',
                variables: {
                    INVITER_NAME: inviter?.name ?? 'Un usuario',
                    WORKSPACE_NAME: workspace.name,
                    INVITE_URL: inviteUrl,
                    EXPIRATION: INVITATION_EXPIRES_HOURS,
                    YEAR: new Date().getFullYear(),
                },
            },
            to: email,
        });

        if (emailError) {
            this.logger.warn(
                `Email de invitacion no enviado: ${emailError.message}`,
            );
        }

        return { success: true, email };
    }

    async cancelInvitation(
        workspaceId: string,
        invitationId: string,
        requesterId: string,
    ) {
        const requester = await this.prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: requesterId } },
        });
        if (!requester?.isOwner)
            throw new ForbiddenException(
                'Solo el propietario puede cancelar invitaciones',
            );

        const inv = await this.prisma.workspaceInvitation.findUnique({
            where: { id: invitationId },
        });
        if (!inv || inv.workspaceId !== workspaceId)
            throw new NotFoundException('Invitación no encontrada');

        await this.prisma.workspaceInvitation.update({
            where: { id: invitationId },
            data: { status: 'cancelled' },
        });
        return { success: true };
    }

    async acceptInvitation(token: string, userId: string) {
        const inv = await this.prisma.workspaceInvitation.findUnique({
            where: { token },
            include: {
                workspace: { select: { name: true, seatsLimit: true } },
            },
        });

        if (!inv) throw new NotFoundException('Invitación no encontrada');
        if (inv.status !== 'pending')
            throw new BadRequestException('Esta invitación ya no está activa');
        if (inv.expiresAt < new Date())
            throw new BadRequestException('La invitación ha expirado');

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (user?.email.toLowerCase() !== inv.email.toLowerCase())
            throw new ForbiddenException(
                'Esta invitación es para otro correo electrónico',
            );

        const alreadyMember = await this.isMember(inv.workspaceId, userId);
        if (alreadyMember)
            throw new ConflictException('Ya eres miembro de este workspace');

        const memberCount = await this.countMembers(inv.workspaceId);
        if (memberCount >= inv.workspace.seatsLimit)
            throw new ForbiddenException(
                'El workspace ha alcanzado su límite de miembros',
            );

        await this.prisma.$transaction([
            this.prisma.workspaceMember.create({
                data: { workspaceId: inv.workspaceId, userId },
            }),
            this.prisma.workspaceInvitation.update({
                where: { id: inv.id },
                data: { status: 'accepted' },
            }),
        ]);

        return {
            workspaceId: inv.workspaceId,
            workspaceName: inv.workspace.name,
        };
    }

    async getInvitationInfo(token: string) {
        const inv = await this.prisma.workspaceInvitation.findUnique({
            where: { token },
            select: {
                email: true,
                status: true,
                expiresAt: true,
                workspace: { select: { id: true, name: true, image: true } },
                invitedBy: { select: { name: true } },
            },
        });
        if (!inv) throw new NotFoundException('Invitación no encontrada');

        return {
            email: inv.email,
            status: inv.status,
            expired: inv.expiresAt < new Date(),
            workspaceId: inv.workspace.id,
            workspaceName: inv.workspace.name,
            workspaceImage: inv.workspace.image
                ? await this.storage.getPresignedUrl(inv.workspace.image)
                : null,
            invitedBy: inv.invitedBy.name,
        };
    }
}
