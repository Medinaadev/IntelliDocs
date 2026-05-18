import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFolderDto {
    @IsString()
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(255, {
        message: 'El nombre no puede exceder los 255 caracteres',
    })
    name!: string;

    @IsString()
    @IsOptional()
    parentId?: string | null;

    @IsString()
    @IsOptional()
    color?: string;
}
