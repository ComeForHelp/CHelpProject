import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from '@/features/auth';
import { FormColumn } from '@/widgets/public-shell';

export const metadata: Metadata = { title: 'Регистрация' };

export default function RegisterPage() {
  return (
    <FormColumn
      title="Регистрация"
      description="Заполните данные. Все поля, кроме почты, обязательны."
    >
      <Suspense>
        <RegisterForm />
      </Suspense>
    </FormColumn>
  );
}
