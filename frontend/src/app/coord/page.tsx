'use client';

import { Paper, SimpleGrid, Stack } from '@mantine/core';
import { PageHeader } from '@/shared/ui';
import { SectionTitle, StatCards, UrgentQueue } from '@/widgets/coordinator';

export default function CoordDashboardPage() {
  return (
    <Stack gap="lg">
      <PageHeader
        title="Дашборд"
        description="Счётчики обновляются каждые 30 секунд. Нажмите на карточку, чтобы открыть список"
      />
      <StatCards />
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Paper withBorder p="md" radius="md">
          <SectionTitle>Срочные без волонтёра</SectionTitle>
          <UrgentQueue />
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
