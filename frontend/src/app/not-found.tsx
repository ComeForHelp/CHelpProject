import { Button, Container, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Container size="sm" py={80}>
      <Stack align="center" gap="lg">
        <Title order={1}>Страница не найдена</Title>
        <Text size="lg" ta="center">
          Возможно, ссылка устарела или в адресе опечатка.
        </Text>
        <Button component={Link} href="/" size="xl">
          На главную
        </Button>
      </Stack>
    </Container>
  );
}
