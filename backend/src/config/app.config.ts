/**
 * Чтение и проверка переменных окружения.
 * Приложение не стартует, если обязательная переменная не задана.
 */
export interface AppConfig {
  port: number;
  corsOrigins: string[];
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtlDays: number;
  };
  utcOffsetHours: number;
  recurringHorizonDays: number;
  uploadDir: string;
  uploadMaxBytes: number;
  cronEnabled: boolean;
  /** Сколько прокси (Nginx) стоит перед сервером — чтобы видеть реальный IP клиента. */
  trustProxy: number;
}

function required(env: Record<string, unknown>, key: string): string {
  const value = env[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Не задана переменная окружения ${key} (см. .env.example)`);
  }
  return value;
}

function int(env: Record<string, unknown>, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Переменная ${key} должна быть числом`);
  return n;
}

export function validateEnv(env: Record<string, unknown>): Record<string, unknown> {
  required(env, 'DATABASE_URL');
  required(env, 'JWT_ACCESS_SECRET');
  required(env, 'JWT_REFRESH_SECRET');
  return env;
}

export function loadConfig(): AppConfig {
  const env = process.env as Record<string, unknown>;
  return {
    port: int(env, 'PORT', 3001),
    corsOrigins: String(env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    jwt: {
      accessSecret: required(env, 'JWT_ACCESS_SECRET'),
      refreshSecret: required(env, 'JWT_REFRESH_SECRET'),
      accessTtl: String(env.JWT_ACCESS_TTL ?? '15m'),
      refreshTtlDays: int(env, 'JWT_REFRESH_TTL_DAYS', 30),
    },
    utcOffsetHours: int(env, 'APP_UTC_OFFSET_HOURS', 10),
    recurringHorizonDays: int(env, 'RECURRING_HORIZON_DAYS', 3),
    uploadDir: String(env.UPLOAD_DIR ?? './uploads'),
    uploadMaxBytes: int(env, 'UPLOAD_MAX_MB', 10) * 1024 * 1024,
    cronEnabled: String(env.CRON_ENABLED ?? 'true') !== 'false',
    trustProxy: int(env, 'TRUST_PROXY', 0),
  };
}

export const APP_CONFIG = 'app';
