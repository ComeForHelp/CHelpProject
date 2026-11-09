'use client';

import { PageHeader } from '@/shared/ui';
import { WardCards } from '@/widgets/family';

export default function FamilyPage() {
  return (
    <>
      <PageHeader
        title="Мои подопечные"
        description="Оформляйте заявки за родных и следите за ними"
      />
      <WardCards />
    </>
  );
}
