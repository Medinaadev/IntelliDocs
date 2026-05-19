import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { PrismaService } from 'src/prisma.service';
import { WorkspacesService } from './workspaces.service';
import { AuthModule } from 'src/auth/auth.module';
import { RealtimeModule } from 'src/realtime/realtime.module';
import { WorkspaceMembersModule } from './members/workspace-members.module';
import { WorkspaceListener } from './listeners/workspaces/workspaces.listener';
import { StorageModule } from 'src/storage/storage.module';
import { WorkspacesChannel } from './listeners/workspaces/workspaces.channel';
import { DriveChannel } from './listeners/drive/drive.channel';
import { DriveFileListener, DriveFolderListener } from './listeners/drive/drive.listener';
import { MembersChannel } from './listeners/members/members.channel';
import { WorkspaceMemberListener, WorkspaceInvitationListener } from './listeners/members/members.listener';
import { TagsChannel } from './listeners/tags/tags.channel';
import { TagListener } from './listeners/tags/tags.listener';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceDriveController } from './drive/workspace-drive.controller';
import { WorkspaceTagsController } from './tags/workspace-tags.controller';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { ProcessingModule } from 'src/processing/processing.module';
import { StripeModule } from 'src/stripe/stripe.module';

@Module({
    imports: [
        AuthModule,
        RealtimeModule,
        WorkspaceMembersModule,
        StorageModule,
        ProcessingModule,
        StripeModule,
    ],
    controllers: [
        WorkspacesController,
        WorkspaceController,
        WorkspaceDriveController,
        WorkspaceTagsController,
    ],
    providers: [
        WorkspacesService,
        PrismaService,
        WorkspaceListener,
        WorkspacesChannel,
        DriveChannel,
        DriveFileListener,
        DriveFolderListener,
        MembersChannel,
        WorkspaceMemberListener,
        WorkspaceInvitationListener,
        TagsChannel,
        TagListener,
        WorkspaceMemberGuard,
    ],
})
export class WorkspacesModule {}
