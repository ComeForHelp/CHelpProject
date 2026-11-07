import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators';
import {
  TaskAccess,
  TaskAccessContext,
  TaskAccessGuard,
} from '../../common/guards/task-access.guard';
import { AuthUser } from '../../common/types';
import { AttachmentsService } from './attachments.service';
import { UPLOAD_ATTACHMENT_SCHEMA, UploadAttachmentDto } from './dto/attachments.dto';
import { AttachmentDto } from './dto/attachments-responses.dto';
import { ApiStandardErrors } from '../../common/dto/responses.dto';

/** Жёсткий предел multer; рабочий лимит — UPLOAD_MAX_MB, проверяется в сервисе. */
const HARD_LIMIT_BYTES = 25 * 1024 * 1024;

@ApiTags('attachments')
@ApiBearerAuth()
@ApiParam({ name: 'taskId', format: 'uuid' })
@UseGuards(TaskAccessGuard)
@ApiStandardErrors()
@Controller('tasks/:taskId/attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Файлы заявки (чеки, рецепты, фото)' })
  @ApiOkResponse({ type: [AttachmentDto] })
  list(@TaskAccess() ctx: TaskAccessContext) {
    return this.attachments.list(ctx);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: UPLOAD_ATTACHMENT_SCHEMA })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: HARD_LIMIT_BYTES, files: 1 },
    }),
  )
  @ApiOperation({ summary: 'Загрузить фото чека или рецепта (с камеры телефона)' })
  @ApiCreatedResponse({ type: AttachmentDto })
  upload(
    @CurrentUser() user: AuthUser,
    @TaskAccess() ctx: TaskAccessContext,
    @Body() dto: UploadAttachmentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.attachments.upload(user, ctx, dto.kind, file);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Скачать / показать файл (только участникам заявки)' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf')
  @ApiOkResponse({
    description: 'Файл. Нужен заголовок Authorization — получать через axios как blob',
    schema: { type: 'string', format: 'binary' },
  })
  async file(
    @TaskAccess() ctx: TaskAccessContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const f = await this.attachments.openFile(ctx, id);
    res.set({
      'Content-Type': f.mimeType,
      'Content-Length': String(f.size),
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.fileName)}`,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(f.stream);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить файл' })
  @ApiNoContentResponse({ description: 'Готово, тела ответа нет' })
  async remove(
    @CurrentUser() user: AuthUser,
    @TaskAccess() ctx: TaskAccessContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.attachments.remove(user, ctx, id);
  }
}
