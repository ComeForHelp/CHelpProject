'use client';

import { Button } from '@mantine/core';
import { IconUserPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { PageHeader } from '@/shared/ui';
import { RecipientsList } from '@/widgets/coordinator';

export default function CoordRecipientsPage() {
  return (
    <>
      <PageHeader
        title="Получатели"
        action={
          <Button
            component={Link}
            href="/coord/recipients/new"
            leftSection={<IconUserPlus aria-hidden />}
          >
            Зарегистрировать получателя
          </Button>
        }
      />
      <RecipientsList />
    </>
  );
}
