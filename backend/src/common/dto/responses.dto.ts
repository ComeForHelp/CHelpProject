/**
 * Общие схемы ответов для Swagger. По ним фронтенд генерирует типы:
 *   npx openapi-typescript http://localhost:3001/api/docs-json -o src/shared/api/schema.d.ts
 *
 * Поля без @ApiProperty описывает плагин @nestjs/swagger (nest-cli.json) по типам TypeScript —
 * поэтому файлы называются *.dto.ts. Перечисления указываем явно, чтобы в схеме были enumName.
 */
import { Type, applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptions,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  AttachmentKind,
  ContactPreference,
  Frequency,
  LinkStatus,
  PaymentMethod,
  Role,
  TaskStatus,
  Urgency,
  VerificationStatus,
} from '@prisma/client';

const ENUMS = {
  Role,
  VerificationStatus,
  LinkStatus,
  ContactPreference,
  TaskStatus,
  Urgency,
  PaymentMethod,
  Frequency,
  AttachmentKind,
} as const;

/** Поле-перечисление с именованной схемой (в TS-типах будет общий union). */
export function EnumProperty(
  name: keyof typeof ENUMS,
  options: Omit<ApiPropertyOptions, 'enum' | 'enumName'> = {},
) {
  return ApiProperty({ ...options, enum: ENUMS[name], enumName: name } as ApiPropertyOptions);
}

// ───────────── Ошибки ─────────────

export class ErrorResponseDto {
  /** HTTP-код */
  statusCode: number;
  /** Например, BAD_REQUEST, CONFLICT */
  error: string;
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    description: 'Текст для показа пользователю; у ошибок валидации — массив строк',
  })
  message: string | string[];
  path: string;
  timestamp: string;
}

/** Типовые ошибки — вешается на контроллер целиком. */
export function ApiStandardErrors() {
  const type = ErrorResponseDto;
  return applyDecorators(
    ApiBadRequestResponse({ type, description: 'Ошибка в данных запроса' }),
    ApiUnauthorizedResponse({
      type,
      description: 'Нет токена или он истёк — обновить через /auth/refresh',
    }),
    ApiForbiddenResponse({ type, description: 'Действие недоступно этой роли или чужие данные' }),
    ApiNotFoundResponse({ type, description: 'Не найдено' }),
    ApiConflictResponse({ type, description: 'Конфликт: например, статус заявки уже изменился' }),
    ApiTooManyRequestsResponse({ type, description: 'Слишком много запросов' }),
  );
}

// ───────────── Пагинация ─────────────

export class PaginatedDto {
  total: number;
  page: number;
  limit: number;
}

/** Ответ { items: T[], total, page, limit }. */
export function ApiPaginatedResponse<T extends Type<unknown>>(model: T) {
  return applyDecorators(
    ApiExtraModels(PaginatedDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedDto) },
          {
            type: 'object',
            required: ['items'],
            properties: { items: { type: 'array', items: { $ref: getSchemaPath(model) } } },
          },
        ],
      },
    }),
  );
}

// ───────────── Простые ответы ─────────────

export class OkDto {
  ok: boolean;
}

export class CountDto {
  count: number;
}

export class UpdatedCountDto {
  updated: number;
}

// ───────────── Справочники ─────────────

export class DistrictDto {
  id: number;
  name: string;
}

export class CategoryDto {
  id: number;
  /** groceries, medicine, utilities, escort, delivery, other */
  code: string;
  name: string;
  icon: string | null;
  /** Нужны ли волонтёру свои деньги на покупку */
  needsMoney: boolean;
  sortOrder: number;
}

// ───────────── Люди ─────────────

export class PersonShortDto {
  id: string;
  firstName: string;
  lastName: string;
}

export class PersonWithRoleDto extends PersonShortDto {
  @EnumProperty('Role')
  role: Role;
}

export class PersonContactDto extends PersonShortDto {
  middleName: string | null;
  phone: string;
}

export class UserPublicDto {
  id: string;
  @EnumProperty('Role')
  role: Role;
  /** +7XXXXXXXXXX */
  phone: string;
  email: string | null;
  lastName: string;
  firstName: string;
  middleName: string | null;
  isActive: boolean;
  pdConsentAt: Date | null;
  createdAt: Date;
}

// ───────────── Адрес ─────────────

export class AddressDto {
  id: string;
  userId: string;
  label: string | null;
  districtId: number;
  street: string;
  house: string;
  apartment: string | null;
  entrance: string | null;
  floor: number | null;
  hasElevator: boolean;
  accessNotes: string | null;
  isDefault: boolean;
  createdAt: Date;
  district: DistrictDto;
}
