import { Module } from '@nestjs/common';
import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspaceMembersService } from './workspace-members.service';
import { PrismaService } from 'src/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { ResendService } from 'src/resend.service';
import { StorageModule } from 'src/storage/storage.module';
import { InvitationsController } from '../invitations/invitations.controller';

@Module({
    imports: [AuthModule, StorageModule],
    providers: [WorkspaceMembersService, PrismaService, ResendService],
    controllers: [WorkspaceMembersController, InvitationsController],
    exports: [WorkspaceMembersService],
})
export class WorkspaceMembersModule {}
