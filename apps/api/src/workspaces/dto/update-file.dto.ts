import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateFileDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name?: string;
}
