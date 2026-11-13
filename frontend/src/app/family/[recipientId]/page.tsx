'use client';

import { useParams } from 'next/navigation';
import { RecipientHome } from '@/widgets/recipient';

export default function WardHomePage() {
  const { recipientId } = useParams<{ recipientId: string }>();
  return <RecipientHome recipientId={recipientId} basePath={`/family/${recipientId}`} />;
}
