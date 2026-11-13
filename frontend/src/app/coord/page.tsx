'use client';

import { Paper, SimpleGrid, Stack } from '@mantine/core';
import { PageHeader } from '@/shared/ui';
import {
  PendingVolunteers,
  RecentTasks,
  SectionTitle,
  StatCards,
  UrgentQueue,
  WeekChart,
} from '@/widgets/coordinator';

export default function CoordDashboardPage() {
  return (
    <Stack gap="lg">
      <PageHeader
        title="Обзор"
        description="Обновляется каждые 30 секунд. Нажмите на карточку, чтобы открыть список"
      />
      <StatCards />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Paper withBorder p="lg">
          <SectionTitle>Заявки за неделю</SectionTitle>
          <WeekChart />
        </Paper>
        <Paper withBorder p="lg">
          <SectionTitle>Срочные без волонтёра</SectionTitle>
          <UrgentQueue />
        </Paper>
      </SimpleGrid>
      <Stack gap="sm">
        <SectionTitle>Недавно созданные</SectionTitle>
        <RecentTasks />
      </Stack>
      <Stack gap="sm">
        <SectionTitle>Ждут проверки</SectionTitle>
        <PendingVolunteers />
      </Stack>
    </Stack>
  );
}
