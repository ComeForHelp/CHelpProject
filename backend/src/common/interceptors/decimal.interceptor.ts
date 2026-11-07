import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable, map } from 'rxjs';

/**
 * Prisma отдаёт DECIMAL (суммы, рейтинг) объектом Decimal, который в JSON становится строкой.
 * Фронтенду удобнее числа, поэтому переводим их в number перед отправкой ответа.
 */
export function convertDecimals(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Prisma.Decimal.isDecimal(value)) return (value as Prisma.Decimal).toNumber();
  if (Array.isArray(value)) return value.map(convertDecimals);
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value; // Date, Buffer и т.п.
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = convertDecimals(v);
    return out;
  }
  return value;
}

@Injectable()
export class DecimalInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(convertDecimals));
  }
}
