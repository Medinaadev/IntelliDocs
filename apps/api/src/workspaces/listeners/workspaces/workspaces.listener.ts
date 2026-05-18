import { ClientWorkspaceData } from '@intellidocs/types';
import { Injectable } from '@nestjs/common';
import { Workspace } from 'src/generated/prisma/client';
import { RegisterPgTableChangeListener } from 'src/pg-pubsub/pg-pubsub.decorator';
import { RealtimeListener } from 'src/realtime/realtime-listener.base';
import { RealtimeService } from 'src/realtime/realtime.service';
import { StorageService } from 'src/storage/storage.service';
import { WorkspaceMembersService } from 'src/workspaces/members/workspace-members.service';
import { PrismaService } from 'src/prisma.service';

@Injectable()
@RegisterPgTableChangeListener<Workspace>('Workspace', {
    events: ['INSERT', 'UPDATE', 'DELETE'],
    payloadFields: [
        'id',
        'name',
        'image',
        'plan',
        'seatsLimit',
        'storageLimit',
    ],
})
export class WorkspaceListener extends RealtimeListener<
    Workspace,
    ClientWorkspaceData
> {
    constructor(
        realtime: RealtimeService,
        private readonly workspaceMembersService: WorkspaceMembersService,
        private readonly storage: StorageService,
        private readonly prisma: PrismaService,
    ) {
        super(realtime, 'Workspace');
    }

    protected async getRoomsForRow(row: Workspace): Promise<string[]> {
        const memberIds = await this.workspaceMembersService.getMemberIds(
            row.id,
        );
        return memberIds.map((userId) => `user:${userId}:workspaces`);
    }

    protected async getDataForRow(
        row: Workspace,
    ): Promise<ClientWorkspaceData> {
        const [image, memberCount, storageResult] = await Promise.all([
            row.image
                ? this.storage.getPresignedUrl(row.image)
                : Promise.resolve(null),
            this.workspaceMembersService.countMembers(row.id),
            this.prisma.file.aggregate({
                where: { workspaceId: row.id, trashedAt: null },
                _sum: { size: true },
            }),
        ]);

        return {
            ...row,
            image,
            memberCount,
            storageUsed: Number(storageResult._sum.size ?? 0),
        };
    }
}
