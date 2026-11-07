import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Role } from '@prisma/client';

/** Самостоятельная регистрация: «Мне нужна помощь / Помогаю родному / Хочу помогать». */
export const SELF_REGISTER_ROLES = [Role.RECIPIENT, Role.RELATIVE, Role.VOLUNTEER] as const;
export type SelfRegisterRole = (typeof SELF_REGISTER_ROLES)[number];

export class RegisterDto {
  @ApiProperty({ enum: SELF_REGISTER_ROLES })
  @IsIn(SELF_REGISTER_ROLES)
  role: SelfRegisterRole;

  @ApiProperty({ example: '+7 914 123-45-67' })
  @IsString()
  @Length(10, 20)
  phone: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @Length(8, 72)
  password: string;

  @ApiProperty() @IsString() @Length(1, 100) lastName: string;
  @ApiProperty() @IsString() @Length(1, 100) firstName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) middleName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;

  @ApiProperty({ description: 'Согласие на обработку персональных данных (152-ФЗ)' })
  @IsBoolean()
  @Equals(true, { message: 'Нужно согласие на обработку персональных данных' })
  pdConsent: boolean;
}

export class LoginDto {
  @ApiProperty({ example: '+79141234567' }) @IsString() phone: string;
  @ApiProperty() @IsString() password: string;
}

export class RefreshDto {
  @ApiProperty() @IsString() refreshToken: string;
}

export class TokensResponse {
  accessToken: string;
  refreshToken: string;
}
