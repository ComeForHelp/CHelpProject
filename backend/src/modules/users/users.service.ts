import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { compare } from 'bcryptjs';
import { paginate, paginated } from '../../common/dto/pagination.dto';
import { AuthUser, STAFF_ROLES } from '../../common/types';
import { normalizePhone } from '../../common/utils/phone';
import { userSearchWhere } from '../../common/utils/search';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService, hashPassword } from '../auth/auth.service';
import { VolunteersService } from '../volunteers/volunteers.service';
import { ChangePasswordDto, CreateStaffDto, UpdateMeDto, UsersQueryDto } from './dto/users.dto';

/** Публичные поля пользователя: никогда не отдаём password_hash. */
export const userPublicSelect = {
  id: true,
  role: true,
  phone: true,
  email: true,
  lastName: true,
  firstName: true,
  middleName: true,
  isActive: true,
  pdConsentAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly volunteers: VolunteersService,
  ) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        ...userPublicSelect,
        passwordHash: true,
        recipientProfile: { select: { mobilityNotes: true, contactPreference: true } },
        volunteerProfile: {
          select: {
            verificationStatus: true,
            verificationNote: true,
            verifiedAt: true,
            hasCar: true,
            about: true,
            ratingAvg: true,
            tasksDone: true,
            districts: { select: { district: true } },
          },
        },
      },
    });
    const { passwordHash, volunteerProfile, ...rest } = user;
    return {
      ...rest,
      hasPassword: !!passwordHash,
      volunteerProfile: volunteerProfile && {
        ...volunteerProfile,
        districts: volunteerProfile.districts.map((d) => d.district),
      },
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastName: dto.lastName,
        firstName: dto.firstName,
        middleName: dto.middleName === undefined ? undefined : dto.middleName || null,
        email: dto.email === undefined ? undefined : dto.email?.toLowerCase() || null,
      },
    });
    return this.me(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !(await compare(dto.oldPassword, user.passwordHash))) {
      throw new BadRequestException('Старый пароль указан неверно');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(dto.newPassword) },
    });
    await this.auth.revokeAll(userId);
  }

  /** Координатор задаёт пароль получателю, зарегистрированному «за него». */
  async setPassword(actor: AuthUser, userId: string, password: string): Promise<void> {
    const target = await this.getTarget(actor, userId);
    await this.prisma.user.update({
      where: { id: target.id },
      data: { passwordHash: await hashPassword(password) },
    });
    await this.auth.revokeAll(target.id);
  }

  async setActive(actor: AuthUser, userId: string, isActive: boolean) {
    if (actor.id === userId) throw new BadRequestException('Нельзя заблокировать самого себя');
    const target = await this.getTarget(actor, userId);
    await this.prisma.user.update({ where: { id: target.id }, data: { isActive } });
    if (!isActive) {
      await this.auth.revokeAll(target.id);
      // Заблокированный волонтёр не должен держать заявки — возвращаем их в каталог.
      if (target.role === Role.VOLUNTEER) {
        await this.volunteers.releaseAssignedTasks(target.id, actor.id, 'Волонтёр заблокирован');
      }
    }
    return this.prisma.user.findUniqueOrThrow({
      where: { id: target.id },
      select: userPublicSelect,
    });
  }

  async createStaff(dto: CreateStaffDto) {
    if (!STAFF_ROLES.includes(dto.role)) {
      throw new BadRequestException('Так можно создать только координатора или администратора');
    }
    const phone = normalizePhone(dto.phone);
    if (await this.prisma.user.findUnique({ where: { phone } })) {
      throw new ConflictException('Пользователь с таким телефоном уже есть');
    }
    return this.prisma.user.create({
      data: {
        role: dto.role,
        phone,
        email: dto.email?.toLowerCase(),
        passwordHash: await hashPassword(dto.password),
        lastName: dto.lastName,
        firstName: dto.firstName,
        middleName: dto.middleName || null,
        pdConsentAt: new Date(),
      },
      select: userPublicSelect,
    });
  }

  async list(q: UsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      AND: [q.role ? { role: q.role } : {}, userSearchWhere(q.q) ?? {}],
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userPublicSelect,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        ...paginate(q),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(items, total, q);
  }

  /** Координатор управляет только не-сотрудниками; сотрудниками — администратор. */
  private async getTarget(actor: AuthUser, userId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException('Пользователь не найден');
    if (STAFF_ROLES.includes(target.role) && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Сотрудниками управляет только администратор');
    }
    return target;
  }
}
