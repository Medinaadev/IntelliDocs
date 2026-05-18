import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    @IsString()
    @MinLength(2)
    name: string;

    @IsString()
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;
}
