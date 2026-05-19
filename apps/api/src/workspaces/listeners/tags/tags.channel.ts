import { Injectable } from '@nestjs/common';
import { RegisterRealtimeChannel } from 'src/realtime/realtime.decorator';
import { JwtPayload, RealtimeChannel } from 'src/realtime/realtime.types';
import { WorkspaceMembersService } from 'src/workspaces/members/workspace-members.service';

@Injectable()
@RegisterRealtimeChannel('Tags')
export class TagsChannel implements RealtimeChannel<{ workspaceId: string }> {
    constructor(private readonly members: WorkspaceMembersService) {}

    async canSubscribe(
        user: JwtPayload,
        filters: { workspaceId: string },
    ): Promise<boolean> {
        return this.members.isMember(filters.workspaceId, user.sub);
    }

    async canReceive(): Promise<boolean> {
        return true;
    }

    getRoom(_user: JwtPayload, filters: { workspaceId: string }) {
        return `workspace:${filters.workspaceId}:tags`;
    }
}
