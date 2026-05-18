import { IsString } from 'class-validator';

export class UploadResultDto {
    @IsString()
    storageKey: string;

    @IsString()
    presignedUrl: string;
}
