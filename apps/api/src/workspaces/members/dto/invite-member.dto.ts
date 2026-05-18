import { IsEmail } from 'class-validator';

export class InviteMemberDto {
    @IsEmail({}, { message: 'Email inválido' })
    email: string;
}
