import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Маршрут доступен без токена (вход, регистрация, справочники). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
