import { Injectable } from '@nestjs/common';
import { File, Folder } from 'src/generated/prisma/client';
import { RegisterPgTableChangeListener } from 'src/pg-pubsub/pg-pubsub.decorator';
import { RealtimeListener } from 'src/realtime/realtime-listener.base';
import { RealtimeService } from 'src/realtime/realtime.service';

@Injectable()
@RegisterPgTableChangeListener<File>('File', {
    events: ['INSERT', 'UPDATE', 'DELETE'],
    payloadFields: ['id', 'workspaceId', 'folderId'],
})
export class DriveFileListener extends RealtimeListener<File> {
    constructor(realtime: RealtimeService) {
        super(realtime, 'Drive');
    }

    protected async getRoomsForRow(row: File): Promise<string[]> {
        return [`workspace:${row.workspaceId}:drive`];
    }
}

@Injectable()
@RegisterPgTableChangeListener<Folder>('Folder', {
    events: ['INSERT', 'UPDATE', 'DELETE'],
    payloadFields: ['id', 'workspaceId', 'parentId'],
})
export class DriveFolderListener extends RealtimeListener<Folder> {
    constructor(realtime: RealtimeService) {
        super(realtime, 'Drive');
    }

    protected async getRoomsForRow(row: Folder): Promise<string[]> {
        return [`workspace:${row.workspaceId}:drive`];
    }
}
