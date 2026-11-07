import { ApiPropertyOptional } from '@nestjs/swagger';
import { LinkStatus } from '@prisma/client';
import { EnumProperty } from '../../../common/dto/responses.dto';

export class RelativeLinkDto {
  id: string;
  recipientId: string;
  relativeId: string;
  /** «дочь», «сын» */
  relation: string | null;
  @EnumProperty('LinkStatus')
  status: LinkStatus;
  createdAt: Date;
}

export class LinkPersonDto {
  id: string;
  phone: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  isActive: boolean;
}

/** Получателю: его родственники (вместе с неподтверждёнными запросами) */
export class RelativeOfRecipientDto extends RelativeLinkDto {
  relative: LinkPersonDto;
}

/** До подтверждения связи телефон и отчество подопечного не раскрываются */
export class WardPersonDto {
  id: string;
  firstName: string;
  lastName: string;
  @ApiPropertyOptional({ description: 'Только после подтверждения' })
  phone?: string;
  @ApiPropertyOptional({ nullable: true })
  middleName?: string | null;
  @ApiPropertyOptional()
  isActive?: boolean;
}

/** Родственнику: подопечные для страницы /family */
export class WardLinkDto {
  id: string;
  relation: string | null;
  @EnumProperty('LinkStatus')
  status: LinkStatus;
  createdAt: Date;
  recipient: WardPersonDto;
  /** Активные заявки подопечного */
  activeTasks: number;
  /** Выполнены и ждут подтверждения */
  awaitingConfirmation: number;
}
