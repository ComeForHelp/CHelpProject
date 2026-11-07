import { TransformFnParams } from 'class-transformer';

/** Query-параметр "true"/"false"/"1"/"0" → boolean. */
export function toBoolean({ value }: TransformFnParams): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}

/** Query-параметр "a,b,c" или ?x=a&x=b → массив строк. */
export function toArray({ value }: TransformFnParams): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  const arr = Array.isArray(value) ? value : String(value).split(',');
  return arr.map((v) => String(v).trim()).filter(Boolean);
}

/** Как toArray, но элементы — числа (id справочников). */
export function toIntArray(params: TransformFnParams): unknown {
  const arr = toArray(params);
  return Array.isArray(arr) ? arr.map((v) => Number(v)) : arr;
}

/** Обрезать пробелы у строки. */
export function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
