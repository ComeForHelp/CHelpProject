'use client';

import { useMe } from '@/entities/user';
import { useSession } from '@/shared/model/session';
import { RecipientHome } from '@/widgets/recipient';

export default function MyHomePage() {
  const me = useMe();
  const sessionName = useSession((s) => s.user?.firstName);
  // «Мария Петровна» — вежливое обращение к пожилому человеку, как в макете
  const name = me.data
    ? [me.data.firstName, me.data.middleName].filter(Boolean).join(' ')
    : sessionName;
  return (
    <RecipientHome basePath="/my" greeting={name ? `Здравствуйте, ${name}!` : 'Здравствуйте!'} />
  );
}
