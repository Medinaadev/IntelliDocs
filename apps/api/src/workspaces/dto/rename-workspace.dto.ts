import { IsString, Length } from 'class-validator';

export class RenameWorkspaceDto {
    @IsString()
    @Length(2, 80, { message: 'El nombre debe tener entre 2 y 80 caracteres' })
    name: string;
}
