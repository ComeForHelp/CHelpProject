'use client';

import { useSession } from '@/shared/model/session';
import { RecipientHome } from '@/widgets/recipient';

export default function MyHomePage() {
  const name = useSession((s) => s.user?.firstName);
  return (
    <RecipientHome basePath="/my" greeting={name ? `Здравствуйте, ${name}!` : 'Здравствуйте!'} />
  );
}
