/** «+7 914 123-45-67» из «+79141234567». */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  const ten = d.length === 11 ? d.slice(1) : d;
  if (ten.length !== 10) return phone;
  return `+7 ${ten.slice(0, 3)} ${ten.slice(3, 6)}-${ten.slice(6, 8)}-${ten.slice(8)}`;
}

/** «1 200 ₽» */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} ₽`;
}

/** «Иванова Мария Петровна» */
export function fullName(p: {
  lastName?: string;
  firstName: string;
  middleName?: string | null;
}): string {
  return [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ');
}

/** «Иванова М. П.» */
export function shortName(p: {
  lastName?: string;
  firstName: string;
  middleName?: string | null;
}): string {
  if (!p.lastName) return p.firstName;
  const initials = [p.firstName, p.middleName]
    .filter(Boolean)
    .map((n) => `${n![0]}.`)
    .join(' ');
  return `${p.lastName} ${initials}`;
}

/** Склонение: plural(3, ['заявка', 'заявки', 'заявок']) → «заявки». */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

/** Телефон в виде, который принимает backend (он сам нормализует). */
export function phoneInputToApi(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

/** Простая проверка российского номера для форм. */
export function isValidPhone(value: string): boolean {
  const d = value.replace(/\D/g, '');
  return d.length === 10 || (d.length === 11 && (d.startsWith('7') || d.startsWith('8')));
}
