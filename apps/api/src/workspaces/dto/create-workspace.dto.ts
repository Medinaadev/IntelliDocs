import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWorkspaceDto {
    @IsString()
    @MinLength(3)
    name: string;

    @IsOptional()
    image?: string;
}
