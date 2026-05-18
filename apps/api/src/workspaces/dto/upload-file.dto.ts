import { IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
    @IsString()
    @IsOptional()
    folderId?: string;
}
