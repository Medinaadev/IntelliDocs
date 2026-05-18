import { IsString } from 'class-validator';

export class GetBreadcrumbsDto {
    @IsString()
    folderId: string;
}
