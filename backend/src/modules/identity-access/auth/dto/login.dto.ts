import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Username, email, or phone — whichever the account was set up with. */
  @IsString()
  @MinLength(1)
  identifier!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  totpCode?: string;
}
