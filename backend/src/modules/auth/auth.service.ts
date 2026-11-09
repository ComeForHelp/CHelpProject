import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, VerificationStatus } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { normalizePhone } from '../../common/utils/phone';
import { APP_CONFIG, AppConfig } from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

export const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

interface RefreshPayload {
  sub: string;
  jti: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    role: Role;
    firstName: string;
    lastName: string;
    verificationStatus: VerificationStatus | null;
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const phone = normalizePhone(dto.phone);
    const exists = await this.prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (exists) throw new ConflictException('Пользователь с таким телефоном уже зарегистрирован');

    const user = await this.prisma.user.create({
      data: {
        role: dto.role,
        phone,
        email: dto.email?.toLowerCase(),
        passwordHash: await hashPassword(dto.password),
        lastName: dto.lastName.trim(),
        firstName: dto.firstName.trim(),
        middleName: dto.middleName?.trim() || null,
        pdConsentAt: new Date(),
        ...(dto.role === Role.RECIPIENT ? { recipientProfile: { create: {} } } : {}),
        ...(dto.role === Role.VOLUNTEER ? { volunteerProfile: { create: {} } } : {}),
      },
    });
    return this.issueTokens(user.id);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    let phone: string;
    try {
      phone = normalizePhone(dto.phone);
    } catch {
      throw new UnauthorizedException('Неверный телефон или пароль');
    }
    const user = await this.prisma.user.findUnique({ where: { phone } });
    // Одинаковый ответ для «нет пользователя» и «неверный пароль» — не раскрываем, кто зарегистрирован.
    if (!user?.passwordHash || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Неверный телефон или пароль');
    }
    if (!user.isActive)
      throw new UnauthorizedException('Аккаунт заблокирован. Позвоните координатору');
    return this.issueTokens(user.id);
  }

  /** Ротация: старый refresh-токен отзывается, выдаётся новая пара. */
  async refresh(refreshToken: string): Promise<AuthResult> {
    const stored = await this.findValidRefresh(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      select: { isActive: true },
    });
    if (!user?.isActive) throw new UnauthorizedException('Аккаунт заблокирован');

    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    // Параллельный запрос уже использовал этот токен.
    if (revoked.count === 0) throw new UnauthorizedException('Сессия истекла, войдите снова');
    return this.issueTokens(stored.userId);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const stored = await this.findValidRefresh(refreshToken);
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Выход с недействительным токеном — не ошибка.
    }
  }

  /** Завершить все сессии пользователя (смена пароля, блокировка). */
  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async findValidRefresh(token: string) {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(token, {
        secret: this.config.jwt.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Сессия истекла, войдите снова');
    }
    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (
      !stored ||
      stored.userId !== payload.sub ||
      stored.revokedAt ||
      stored.expiresAt <= new Date() ||
      stored.tokenHash !== sha256(token)
    ) {
      throw new UnauthorizedException('Сессия истекла, войдите снова');
    }
    return stored;
  }

  private async issueTokens(userId: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
        volunteerProfile: { select: { verificationStatus: true } },
      },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { secret: this.config.jwt.accessSecret, expiresIn: this.config.jwt.accessTtl as never },
    );

    const jti = randomUUID();
    const days = this.config.jwt.refreshTtlDays;
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti },
      { secret: this.config.jwt.refreshSecret, expiresIn: `${days}d` },
    );
    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + days * 24 * 3600_000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        verificationStatus: user.volunteerProfile?.verificationStatus ?? null,
      },
    };
  }
}
