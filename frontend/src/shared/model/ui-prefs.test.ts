import { A11Y_DEFAULTS, htmlA11yAttributes } from './ui-prefs';

describe('версия для слабовидящих: атрибуты <html>', () => {
  it('выключена — только обычный размер шрифта', () => {
    const attrs = htmlA11yAttributes(20, A11Y_DEFAULTS);
    expect(attrs.fontSize).toBe('20px');
    expect(attrs['data-a11y']).toBeNull();
    expect(attrs['data-a11y-scheme']).toBeNull();
  });
  it('включена — крупный шрифт и выбранные настройки', () => {
    const attrs = htmlA11yAttributes(18, {
      ...A11Y_DEFAULTS,
      enabled: true,
      fontSize: 30,
      scheme: 'wb',
      images: 'off',
    });
    expect(attrs.fontSize).toBe('30px');
    expect(attrs['data-a11y']).toBe('');
    expect(attrs['data-a11y-scheme']).toBe('wb');
    expect(attrs['data-a11y-images']).toBe('off');
  });
});
