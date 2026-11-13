import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { theme } from '../theme/theme';
import { EmptyState, IconTile, PhoneLink, StatusBadge, StepIndicator } from './index';

function wrap(ui: ReactNode) {
  return render(<MantineProvider theme={theme}>{ui}</MantineProvider>);
}

/** Проверка доступности axe-core (контраст в jsdom не считается — его проверяет Lighthouse). */
async function expectNoA11yViolations(container: HTMLElement) {
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

describe('базовые компоненты', () => {
  it('статус заявки — словами, а не кодом', () => {
    wrap(<StatusBadge status="ASSIGNED" />);
    expect(screen.getByText('Волонтёр взял')).toBeInTheDocument();
    expect(screen.queryByText('ASSIGNED')).not.toBeInTheDocument();
  });

  it('шаг формы', () => {
    wrap(<StepIndicator step={2} total={6} title="Подробности" />);
    expect(screen.getByText('Шаг 2 из 6')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Подробности' })).toBeInTheDocument();
  });

  it('плитка: подпись у иконки и состояние «выбрано» для экранного диктора', async () => {
    const onClick = vi.fn();
    const { container } = wrap(
      <IconTile icon={<span>🛒</span>} label="Продукты" selected onClick={onClick} />,
    );
    const tile = screen.getByRole('button', { name: /Продукты/ });
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(tile);
    expect(onClick).toHaveBeenCalledOnce();
    await expectNoA11yViolations(container);
  });

  it('«Позвонить» открывает звонилку', async () => {
    const { container } = wrap(<PhoneLink phone="+79141234567" />);
    expect(screen.getByRole('link', { name: /Позвонить/ })).toHaveAttribute(
      'href',
      'tel:+79141234567',
    );
    await expectNoA11yViolations(container);
  });

  it('пустое состояние без нарушений доступности', async () => {
    const { container } = wrap(<EmptyState title="Заявок нет" text="Нажмите «Нужна помощь»" />);
    await expectNoA11yViolations(container);
  });
});
