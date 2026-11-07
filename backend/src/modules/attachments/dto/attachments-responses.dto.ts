import { AttachmentKind } from '@prisma/client';
import { EnumProperty, PersonWithRoleDto } from '../../../common/dto/responses.dto';

/**
 * Сам файл: GET /tasks/{taskId}/attachments/{id}/file с заголовком Authorization.
 * <img src> напрямую не сработает — скачать как blob и показать через URL.createObjectURL.
 */
export class AttachmentDto {
  id: string;
  taskId: string;
  @EnumProperty('AttachmentKind')
  kind: AttachmentKind;
  /** Определён по содержимому файла, а не по расширению */
  mimeType: string;
  sizeBytes: number;
  originalName: string | null;
  createdAt: Date;
  uploadedBy: PersonWithRoleDto;
}
