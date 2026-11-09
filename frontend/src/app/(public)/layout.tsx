import { Container } from '@mantine/core';
import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <Container component="main" id="main" size="md" py="xl">
      {children}
    </Container>
  );
}
