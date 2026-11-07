import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { trim } from '../../../common/utils/transform';

export class UpdateMeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  lastName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  firstName?: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  middleName?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsEmail() email?: string | null;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() oldPassword: string;
  @ApiProperty({ minLength: 8 }) @IsString() @Length(8, 72) newPassword: string;
}

export class SetPasswordDto {
  @ApiProperty({ minLength: 8 }) @IsString() @Length(8, 72) password: string;
}

export class CreateStaffDto {
  @ApiProperty({ enum: [Role.COORDINATOR, Role.ADMIN] })
  @IsEnum(Role)
  role: Role;

  @ApiProperty() @IsString() @Length(10, 20) phone: string;
  @ApiProperty() @IsString() @Length(8, 72) password: string;
  @ApiProperty() @Transform(trim) @IsString() @Length(1, 100) lastName: string;
  @ApiProperty() @Transform(trim) @IsString() @Length(1, 100) firstName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) middleName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
}

export class UsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Role }) @IsOptional() @IsEnum(Role) role?: Role;
  @ApiPropertyOptional({ description: 'Поиск по ФИО или телефону' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class BlockUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
