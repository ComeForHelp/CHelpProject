import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trim } from '../../../common/utils/transform';

export class AddressFieldsDto {
  @ApiPropertyOptional({ example: 'Дом' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  label?: string;

  @ApiProperty() @IsInt() districtId: number;

  @ApiProperty({ example: 'ул. Светланская' })
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  street: string;

  @ApiProperty({ example: '45' }) @Transform(trim) @IsString() @Length(1, 20) house: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) apartment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) entrance?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(-5)
  @Max(100)
  floor?: number;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() hasElevator?: boolean;

  @ApiPropertyOptional({
    example: '80 ступеней от остановки, домофон 45К',
    description: 'Лестницы, подъём, код домофона. Волонтёр видит только после взятия заявки.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  accessNotes?: string;

  @ApiPropertyOptional({ description: 'Сделать адресом по умолчанию' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateAddressDto extends AddressFieldsDto {
  @ApiPropertyOptional({ description: 'Чей адрес (родственнику и координатору — обязательно)' })
  @IsOptional()
  @IsUUID()
  recipientId?: string;
}

export class UpdateAddressDto extends PartialType(AddressFieldsDto) {}

export class AddressesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() recipientId?: string;
}
