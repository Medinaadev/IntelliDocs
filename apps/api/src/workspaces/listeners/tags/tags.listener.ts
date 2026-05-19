import { Injectable } from '@nestjs/common';
import { Tag } from 'src/generated/prisma/client';
import { RegisterPgTableChangeListener } from 'src/pg-pubsub/pg-pubsub.decorator';
import { RealtimeListener } from 'src/realtime/realtime-listener.base';
import { RealtimeService } from 'src/realtime/realtime.service';

@Injectable()
@RegisterPgTableChangeListener<Tag>('Tag', {
    events: ['INSERT', 'UPDATE', 'DELETE'],
    payloadFields: ['id', 'workspaceId', 'name'],
})
export class TagListener extends RealtimeListener<Tag> {
    constructor(realtime: RealtimeService) {
        super(realtime, 'Tags');
    }

    protected async getRoomsForRow(row: Tag): Promise<string[]> {
        return [`workspace:${row.workspaceId}:tags`];
    }
}
