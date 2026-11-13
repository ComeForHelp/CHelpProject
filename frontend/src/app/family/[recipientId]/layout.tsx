'use client';

import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { WardHeader } from '@/widgets/family';

export default function WardLayout({ children }: { children: ReactNode }) {
  const { recipientId } = useParams<{ recipientId: string }>();
  return (
    <>
      <WardHeader recipientId={recipientId} />
      {children}
    </>
  );
}
