import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaService } from 'src/prisma.service';
import { StorageModule } from 'src/storage/storage.module';
import { WorkspaceMembersModule } from 'src/workspaces/members/workspace-members.module';
import { FILE_PROCESSING_QUEUE } from './processing.constants';
import { ProcessingController } from './processing.controller';
import { ProcessingProcessor } from './processing.processor';
import { ProcessingService } from './processing.service';

@Module({
    imports: [
        BullModule.registerQueue({ name: FILE_PROCESSING_QUEUE }),
        StorageModule,
        AuthModule,
        WorkspaceMembersModule,
    ],
    controllers: [ProcessingController],
    providers: [ProcessingService, ProcessingProcessor, PrismaService],
    exports: [ProcessingService],
})
export class ProcessingModule {}
