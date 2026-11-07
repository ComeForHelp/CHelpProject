import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ContactPreference } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { trim } from '../../../common/utils/transform';
import { AddressFieldsDto } from '../../addresses/dto/address.dto';

export class RecipientProfileFieldsDto {
  @ApiPropertyOptional({ example: 'Хожу с тростью, плохо слышу — звонить громко' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mobilityNotes?: string;

  @ApiPropertyOptional({ enum: ContactPreference })
  @IsOptional()
  @IsEnum(ContactPreference)
  contactPreference?: ContactPreference;
}

export class UpdateRecipientDto extends RecipientProfileFieldsDto {}

/** Регистрация получателя родственником или координатором (заявка по телефону). */
export class CreateRecipientDto extends RecipientProfileFieldsDto {
  @ApiProperty({ example: '+7 914 000-00-01' }) @IsString() @Length(10, 20) phone: string;
  @ApiProperty() @Transform(trim) @IsString() @Length(1, 100) lastName: string;
  @ApiProperty() @Transform(trim) @IsString() @Length(1, 100) firstName: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @ApiPropertyOptional({
    description: 'Если не задан — войти сам человек не сможет, заявки оформляют за него',
  })
  @IsOptional()
  @IsString()
  @Length(8, 72)
  password?: string;

  @ApiPropertyOptional({ description: 'Кем приходится (для родственника)', example: 'мама' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  relation?: string;

  @ApiPropertyOptional({ type: AddressFieldsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressFieldsDto)
  address?: AddressFieldsDto;

  @ApiProperty({ description: 'Получено согласие человека на обработку ПД (152-ФЗ)' })
  @IsBoolean()
  @Equals(true, { message: 'Нужно согласие получателя на обработку персональных данных' })
  pdConsent: boolean;
}

export class RecipientsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Поиск по ФИО или телефону' })
  @IsOptional()
  @IsString()
  q?: string;
}
