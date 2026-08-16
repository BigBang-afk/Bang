import { IsString, MinLength } from 'class-validator';

export class RequestPasswordResetDto {
  /** Username, email, or phone — whichever the account was set up with. */
  @IsString()
  @MinLength(1)
  identifier!: string;
}
