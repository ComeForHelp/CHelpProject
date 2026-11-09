import { PersonWithRoleDto } from '../../../common/dto/responses.dto';

export class CommentDto {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: Date;
  author: PersonWithRoleDto;
}
