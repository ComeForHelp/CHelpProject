import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ADDRESS_MESSAGES,
  APARTMENT_RE,
  ENTRANCE_RE,
  HOUSE_RE,
  STREET_RE,
} from '../../../common/utils/address-rules';
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
  @Matches(STREET_RE, { message: ADDRESS_MESSAGES.street })
  street: string;

  @ApiProperty({ example: '45' })
  @Transform(trim)
  @IsString()
  @Length(1, 20)
  @Matches(HOUSE_RE, { message: ADDRESS_MESSAGES.house })
  house: string;

  @ApiPropertyOptional({ example: '12' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  @Matches(APARTMENT_RE, { message: ADDRESS_MESSAGES.apartment })
  apartment?: string;

  @ApiPropertyOptional({ example: '2' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10)
  @Matches(ENTRANCE_RE, { message: ADDRESS_MESSAGES.entrance })
  entrance?: string;

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
