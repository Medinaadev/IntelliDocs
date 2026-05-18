import {
    Body,
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('storage')
export class StorageController {
    constructor(private readonly storageService: StorageService) {}

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body('workspaceId') workspaceId: string,
    ) {
        const result = await this.storageService.uploadFile(file, workspaceId);

        return {
            storageKey: result.storageKey,
            presignedUrl: await this.storageService.getPresignedUrl(
                result.storageKey,
            ),
        };
    }
}
