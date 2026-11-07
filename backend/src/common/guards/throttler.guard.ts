import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, seconds } from '@nestjs/throttler';
import { Request } from 'express';

/** Маршруты входа и регистрации — для них отдельные, строгие лимиты. */
function isAuthRoute(ctx: ExecutionContext): boolean {
  const req = ctx.switchToHttp().getRequest<Request>();
  return /\/auth\/(login|register|refresh)$/.test(req.path ?? '');
}

/** Поля запроса Express, которые нужны для подсчёта лимитов. */
interface TrackedRequest {
  ip?: string;
  ips?: string[];
  body?: { phone?: unknown };
}

function clientIp(req: TrackedRequest): string {
  // За Nginx реальный IP приходит в X-Forwarded-For — Express разбирает его, если включён trust proxy.
  return (req.ips?.length ? req.ips[0] : req.ip) ?? 'unknown';
}

/** Последние 10 цифр телефона из тела запроса — чтобы «8 914…» и «+7 914…» считались одним номером. */
function phoneFromBody(req: TrackedRequest): string {
  const raw = req.body?.phone;
  return typeof raw === 'string' ? raw.replace(/\D/g, '').slice(-10) : '';
}

/**
 * Три лимита:
 *  - default — 300 запросов в минуту с одного IP на весь API (защита от зацикленного фронтенда и флуда);
 *  - auth    — 30 запросов в минуту с одного IP на вход/регистрацию (перебор по многим телефонам);
 *  - login   — 10 попыток в минуту на пару «IP + телефон» (подбор пароля к одному аккаунту).
 * Лимит по одному телефону без IP не вводим: иначе злоумышленник мог бы заблокировать вход
 * пожилому человеку, просто перебирая пароли к его номеру.
 */
export function throttlerOptions(): ThrottlerModuleOptions {
  const disabled = process.env.THROTTLE_ENABLED === 'false';
  return {
    errorMessage: 'Слишком много попыток. Подождите минуту и попробуйте снова',
    throttlers: [
      { name: 'default', ttl: seconds(60), limit: 300 },
      { name: 'auth', ttl: seconds(60), limit: 30, skipIf: (ctx) => !isAuthRoute(ctx) },
      {
        name: 'login',
        ttl: seconds(60),
        limit: 10,
        skipIf: (ctx) => !isAuthRoute(ctx),
        getTracker: (req) => `${clientIp(req)}:${phoneFromBody(req)}`,
      },
    ],
    skipIf: () => disabled,
  };
}

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: TrackedRequest): Promise<string> {
    return clientIp(req);
  }
}
