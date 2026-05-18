import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
    imports: [ConfigModule],
    providers: [StorageService],
    exports: [StorageService],
    controllers: [StorageController],
})
export class StorageModule {}
