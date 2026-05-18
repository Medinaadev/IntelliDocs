import { Injectable } from '@nestjs/common';
import { RegisterRealtimeChannel } from 'src/realtime/realtime.decorator';
import { JwtPayload, RealtimeChannel } from 'src/realtime/realtime.types';
import { WorkspaceMembersService } from 'src/workspaces/members/workspace-members.service';

@Injectable()
@RegisterRealtimeChannel('Workspace')
export class WorkspacesChannel implements RealtimeChannel {
    constructor(
        private readonly workspaceMembersService: WorkspaceMembersService,
    ) {}

    async canSubscribe(user: JwtPayload): Promise<boolean> {
        return !!user.sub;
    }

    async canReceive(): Promise<boolean> {
        return true;
    }

    getRoom(user: JwtPayload) {
        return `user:${user.sub}:workspaces`;
    }
}
