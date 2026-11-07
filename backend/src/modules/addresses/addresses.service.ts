import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessService } from '../../common/access/access.service';
import { AuthUser } from '../../common/types';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVE_STATUSES } from '../tasks/task-status.machine';
import { AddressFieldsDto, CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AddressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(user: AuthUser, recipientId?: string) {
    const id = await this.access.resolveRecipientFor(user, recipientId);
    return this.prisma.address.findMany({
      where: { userId: id },
      include: { district: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(user: AuthUser, dto: CreateAddressDto) {
    const { recipientId, ...fields } = dto;
    const userId = await this.access.resolveRecipientFor(user, recipientId);
    return this.prisma.$transaction((tx) => this.createFor(userId, fields, tx));
  }

  /** Используется и при регистрации получателя «за него». Первый адрес становится основным. */
  async createFor(userId: string, dto: AddressFieldsDto, db: Db) {
    await this.assertDistrict(dto.districtId, db);
    const count = await db.address.count({ where: { userId } });
    const isDefault = count === 0 || !!dto.isDefault;
    if (isDefault && count > 0) {
      await db.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return db.address.create({
      data: { ...dto, userId, isDefault },
      include: { district: true },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateAddressDto) {
    const address = await this.getManaged(user, id);
    if (dto.districtId !== undefined) await this.assertDistrict(dto.districtId, this.prisma);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId: address.userId },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id },
        // Снять «по умолчанию» можно, только выбрав другой адрес основным.
        data: { ...dto, isDefault: dto.isDefault ? true : undefined },
        include: { district: true },
      });
    });
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const address = await this.getManaged(user, id);
    const used = await this.prisma.task.count({
      where: { addressId: id, status: { in: ACTIVE_STATUSES } },
    });
    if (used) throw new ConflictException('По этому адресу есть активные заявки');
    const usedByRules = await this.prisma.recurringRule.count({ where: { addressId: id } });
    if (usedByRules) throw new ConflictException('Адрес используется в регулярном поручении');
    const history = await this.prisma.task.count({ where: { addressId: id } });
    if (history) {
      // Адрес нужен истории заявок — удалить нельзя, но и мешать в списке он не должен.
      throw new ConflictException('По этому адресу были заявки — его можно только изменить');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      if (address.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId: address.userId },
          orderBy: { createdAt: 'asc' },
        });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
  }

  /** Адрес принадлежит получателю — для заявок и регулярных правил. */
  async assertBelongs(addressId: string, recipientId: string, db: Db = this.prisma) {
    const a = await db.address.findUnique({ where: { id: addressId }, select: { userId: true } });
    if (!a || a.userId !== recipientId)
      throw new BadRequestException('Адрес не принадлежит получателю');
  }

  private async getManaged(user: AuthUser, id: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) throw new NotFoundException('Адрес не найден');
    await this.access.assertCanManageRecipient(user, address.userId);
    return address;
  }

  private async assertDistrict(districtId: number, db: Db) {
    if (!(await db.district.findUnique({ where: { id: districtId } }))) {
      throw new BadRequestException('Неизвестный район');
    }
  }
}
