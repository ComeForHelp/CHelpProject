import { ApiProperty } from '@nestjs/swagger';
import { NotificationType, NotificationTypeValue } from '../notifications.service';

export class NotificationDto {
  id: string;
  userId: string;
  /** Ссылка на заявку — открыть по клику */
  taskId: string | null;
  @ApiProperty({ enum: Object.values(NotificationType), enumName: 'NotificationType' })
  type: NotificationTypeValue;
  title: string;
  body: string | null;
  /** null — не прочитано */
  readAt: Date | null;
  createdAt: Date;
}
