import { PgTableChanges } from '@intellidocs/types';
import { Injectable } from '@nestjs/common';
import { WorkspaceMember } from 'src/generated/prisma/client';
import { RegisterPgTableChangeListener } from 'src/pg-pubsub/pg-pubsub.decorator';
import { RealtimeListener } from 'src/realtime/realtime-listener.base';
import { RealtimeService } from 'src/realtime/realtime.service';

@Injectable()
@RegisterPgTableChangeListener<WorkspaceMember>('WorkspaceMember', {
    events: ['INSERT', 'UPDATE', 'DELETE'],
    payloadFields: ['id', 'workspaceId', 'userId'],
})
export class WorkspaceListener extends RealtimeListener<WorkspaceMember> {
    constructor(realtime: RealtimeService) {
        super(realtime, 'WorkspaceMember');
    }

    protected getRoom(row: WorkspaceMember): string {
        return `workspace:${row.workspaceId}`;
    }

    async process(changes: PgTableChanges<WorkspaceMember>): Promise<void> {
        for (const payload of changes.DELETE) {
            await this.realtime.removeFromRoom(
                `workspace:${payload.data.workspaceId}`,
                payload.data.userId,
            );
        }

        await super.process(changes);
    }
}
