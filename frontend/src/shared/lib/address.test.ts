import { APARTMENT_RE, ENTRANCE_RE, HOUSE_RE, STREET_RE } from './address';

describe('правила адреса', () => {
  it.each(['ул. Светланская', 'пр-т 100-летия Владивостока', 'Русская'])('улица «%s» — да', (v) =>
    expect(STREET_RE.test(v)).toBe(true),
  );
  it.each(['12', 'ab', '!!'])('улица «%s» — нет', (v) => expect(STREET_RE.test(v)).toBe(false));
  it.each(['45', '45а', '45/2', '45 к2', '45 корп. 1', '12 стр. 3'])('дом «%s» — да', (v) =>
    expect(HOUSE_RE.test(v)).toBe(true),
  );
  it.each(['вау', 'укцу', ''])('дом «%s» — нет', (v) => expect(HOUSE_RE.test(v)).toBe(false));
  it('подъезд и квартира — номера', () => {
    expect(ENTRANCE_RE.test('2')).toBe(true);
    expect(ENTRANCE_RE.test('укцу')).toBe(false);
    expect(APARTMENT_RE.test('12а')).toBe(true);
    expect(APARTMENT_RE.test('уца')).toBe(false);
  });
});
