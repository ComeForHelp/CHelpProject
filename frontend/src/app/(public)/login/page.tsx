import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth';
import { FormColumn } from '@/widgets/public-shell';

export const metadata: Metadata = { title: 'Вход' };

export default function LoginPage() {
  return (
    <FormColumn title="Вход" description="Введите телефон и пароль, указанные при регистрации.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </FormColumn>
  );
}
