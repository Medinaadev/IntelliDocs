import { Injectable } from '@nestjs/common';
import {
    WorkspaceMember,
    WorkspaceInvitation,
} from 'src/generated/prisma/client';
import { RegisterPgTableChangeListener } from 'src/pg-pubsub/pg-pubsub.decorator';
import { RealtimeListener } from 'src/realtime/realtime-listener.base';
import { RealtimeService } from 'src/realtime/realtime.service';

@Injectable()
@RegisterPgTableChangeListener<WorkspaceMember>('WorkspaceMember', {
    events: ['INSERT', 'UPDATE', 'DELETE'],
    payloadFields: ['id', 'workspaceId', 'userId'],
})
export class WorkspaceMemberListener extends RealtimeListener<WorkspaceMember> {
    constructor(realtime: RealtimeService) {
        super(realtime, 'Members');
    }

    protected async getRoomsForRow(row: WorkspaceMember): Promise<string[]> {
        return [`workspace:${row.workspaceId}:members`];
    }
}

@Injectable()
@RegisterPgTableChangeListener<WorkspaceInvitation>('WorkspaceInvitation', {
    events: ['INSERT', 'UPDATE', 'DELETE'],
    payloadFields: ['id', 'workspaceId', 'email', 'status'],
})
export class WorkspaceInvitationListener extends RealtimeListener<WorkspaceInvitation> {
    constructor(realtime: RealtimeService) {
        super(realtime, 'Members');
    }

    protected async getRoomsForRow(
        row: WorkspaceInvitation,
    ): Promise<string[]> {
        return [`workspace:${row.workspaceId}:members`];
    }
}
