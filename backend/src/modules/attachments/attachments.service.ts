import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { AttachmentKind, TaskStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { AccessService } from '../../common/access/access.service';
import { TaskAccessContext } from '../../common/guards/task-access.guard';
import { AuthUser } from '../../common/types';
import { APP_CONFIG, AppConfig } from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { MIME_EXTENSIONS, detectMime } from './file-signature';

const attachmentSelect = {
  id: true,
  taskId: true,
  kind: true,
  mimeType: true,
  sizeBytes: true,
  originalName: true,
  createdAt: true,
  uploadedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
} as const;

/** Финальные заявки — вложения уже не меняем, это история для отчёта. */
const LOCKED: TaskStatus[] = [TaskStatus.CONFIRMED, TaskStatus.CANCELLED, TaskStatus.EXPIRED];

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly root: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly notifications: NotificationsService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    this.root = resolve(config.uploadDir);
  }

  list(ctx: TaskAccessContext) {
    return this.prisma.attachment.findMany({
      where: { taskId: ctx.task.id },
      orderBy: { createdAt: 'asc' },
      select: attachmentSelect,
    });
  }

  async upload(
    user: AuthUser,
    ctx: TaskAccessContext,
    kind: AttachmentKind,
    file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Файл не передан');
    if (file.size > this.config.uploadMaxBytes) {
      throw new PayloadTooLargeException(
        `Файл больше ${Math.round(this.config.uploadMaxBytes / 1024 / 1024)} МБ`,
      );
    }
    if (LOCKED.includes(ctx.task.status)) {
      throw new ConflictException('Заявка закрыта — добавить файл нельзя');
    }
    const mime = detectMime(file.buffer);
    if (!mime)
      throw new BadRequestException('Можно загрузить только фото (JPEG, PNG, WebP, HEIC) или PDF');

    const relPath = join(ctx.task.id, `${randomUUID()}${MIME_EXTENSIONS[mime]}`);
    const absPath = this.absolute(relPath);
    await mkdir(join(this.root, ctx.task.id), { recursive: true });
    await writeFile(absPath, file.buffer);

    let attachment;
    try {
      attachment = await this.prisma.attachment.create({
        data: {
          taskId: ctx.task.id,
          uploadedById: user.id,
          kind,
          filePath: relPath.split(sep).join('/'),
          originalName: file.originalname?.slice(0, 255) || null,
          mimeType: mime,
          sizeBytes: file.size,
        },
        select: attachmentSelect,
      });
    } catch (e) {
      await unlink(absPath).catch(() => undefined);
      throw e;
    }

    if (kind === AttachmentKind.RECEIPT && ctx.relation === 'VOLUNTEER') {
      const owners = await this.access.ownerUserIds(ctx.task.recipientId);
      await this.notifications.notify(owners, {
        type: NotificationType.TASK_ATTACHMENT,
        title: 'Волонтёр загрузил чек',
        body: 'Проверьте сумму перед подтверждением.',
        taskId: ctx.task.id,
      });
    }
    return attachment;
  }

  async openFile(ctx: TaskAccessContext, id: string) {
    const a = await this.get(ctx, id);
    const abs = this.absolute(a.filePath);
    if (!existsSync(abs)) throw new NotFoundException('Файл не найден на сервере');
    return {
      stream: createReadStream(abs),
      mimeType: a.mimeType,
      fileName: a.originalName ?? `${a.kind.toLowerCase()}${MIME_EXTENSIONS[a.mimeType] ?? ''}`,
      size: a.sizeBytes,
    };
  }

  /** Удалить может загрузивший или координатор, пока заявка не закрыта. */
  async remove(user: AuthUser, ctx: TaskAccessContext, id: string): Promise<void> {
    const a = await this.get(ctx, id);
    if (ctx.relation !== 'STAFF' && a.uploadedById !== user.id) {
      throw new ForbiddenException('Удалить файл может только тот, кто его загрузил');
    }
    if (LOCKED.includes(ctx.task.status) && ctx.relation !== 'STAFF') {
      throw new ConflictException('Заявка закрыта — файл удалить нельзя');
    }
    await this.prisma.attachment.delete({ where: { id } });
    await unlink(this.absolute(a.filePath)).catch((e: unknown) =>
      this.logger.warn(`Файл ${a.filePath} не удалён: ${String(e)}`),
    );
  }

  private async get(ctx: TaskAccessContext, id: string) {
    const a = await this.prisma.attachment.findUnique({ where: { id } });
    if (!a || a.taskId !== ctx.task.id) throw new NotFoundException('Файл не найден');
    return a;
  }

  /** Путь внутри папки загрузок — защита от «../» в file_path. */
  private absolute(relPath: string): string {
    const abs = resolve(this.root, relPath);
    if (!abs.startsWith(this.root + sep)) throw new BadRequestException('Некорректный путь файла');
    return abs;
  }
}
