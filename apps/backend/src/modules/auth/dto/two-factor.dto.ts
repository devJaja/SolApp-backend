import { IsString, IsEmail, IsBoolean, IsOptional, Length } from 'class-validator';

export class Setup2FADto {
  // No body needed - uses authenticated user
}

export class Verify2FADto {
  @IsString()
  @Length(6, 6)
  code: string;
}

export class Disable2FADto {
  // No body needed - uses authenticated user
}

export class Verify2FALoginDto {
  @IsEmail()
  email: string;

  @IsString()
  tempToken: string;

  @IsString()
  @Length(6, 9) // 6 for TOTP, 8-9 for recovery code
  code: string;

  @IsBoolean()
  @IsOptional()
  isRecoveryCode?: boolean;
}

export class Resend2FACodeDto {
  @IsEmail()
  email: string;
}
