import { IsString } from 'class-validator';
export class AssignTagDto {
    @IsString() tagId!: string;
}
