import { PersonWithRoleDto } from '../../../common/dto/responses.dto';

export class ReviewDto {
  id: string;
  taskId: string;
  authorId: string;
  /** Кого оценили — волонтёр заявки */
  targetId: string;
  /** 1–5 */
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export class ReviewWithAuthorDto extends ReviewDto {
  author: PersonWithRoleDto;
}
