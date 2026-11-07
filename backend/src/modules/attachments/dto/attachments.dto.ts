import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AttachmentKind } from '@prisma/client';

/**
 * Текстовые поля multipart-формы. Сам файл (поле `file`) приходит через FileInterceptor
 * и описан в Swagger схемой UPLOAD_ATTACHMENT_SCHEMA — в DTO его держать нельзя:
 * при target ES2022 поле класса существует всегда и ValidationPipe отклонит его как лишнее.
 */
export class UploadAttachmentDto {
  @ApiProperty({ enum: AttachmentKind, description: 'RECEIPT — чек, PRESCRIPTION — рецепт' })
  @IsEnum(AttachmentKind)
  kind: AttachmentKind;
}

export const UPLOAD_ATTACHMENT_SCHEMA = {
  type: 'object',
  required: ['kind', 'file'],
  properties: {
    kind: { type: 'string', enum: Object.values(AttachmentKind) },
    file: { type: 'string', format: 'binary', description: 'JPEG, PNG, WebP, HEIC или PDF' },
  },
};
