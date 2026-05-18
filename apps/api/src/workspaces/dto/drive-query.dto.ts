import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetDriveQueryDto {
    @IsOptional()
    parentId?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 50;

    @IsOptional()
    @IsString()
    cursor?: string;

    @IsOptional()
    @IsString()
    q?: string;

    @IsOptional()
    @IsString()
    tagId?: string;
}
