import { Anchor, Button, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconHeartHandshake, IconUserHeart, IconUsers } from '@tabler/icons-react';
import Link from 'next/link';

const CHOICES = [
  {
    role: 'RECIPIENT',
    title: 'Мне нужна помощь',
    text: 'Купить продукты и лекарства, оплатить ЖКХ, проводить до поликлиники',
    icon: IconUserHeart,
  },
  {
    role: 'RELATIVE',
    title: 'Помогаю родному',
    text: 'Оформляйте заявки за маму, папу или бабушку и следите, как они выполняются',
    icon: IconUsers,
  },
  {
    role: 'VOLUNTEER',
    title: 'Хочу помогать',
    text: 'Берите поручения рядом с домом после проверки координатором',
    icon: IconHeartHandshake,
  },
];

export default function HomePage() {
  return (
    <Stack gap="xl">
      <Stack gap="sm">
        <Title order={1} fz="2.2rem" c="blue.8">
          Иду на помощь!
        </Title>
        <Text size="xl">
          Бытовая помощь пожилым и маломобильным людям во Владивостоке. Оставьте заявку —
          проверенный волонтёр купит продукты, лекарства или проводит к врачу.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
        {CHOICES.map(({ role, title, text, icon: Icon }) => (
          <Paper key={role} withBorder p="lg" radius="md">
            <Stack gap="md" h="100%" justify="space-between">
              <Stack gap="xs">
                <Icon size={48} color="var(--mantine-color-blue-8)" aria-hidden />
                <Title order={2} size="h3">
                  {title}
                </Title>
                <Text>{text}</Text>
              </Stack>
              <Button component={Link} href={`/register?role=${role}`} size="lg" fullWidth>
                {title}
              </Button>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>

      <Paper withBorder p="lg" radius="md">
        <Stack gap="sm" align="flex-start">
          <Text size="lg" fw={700}>
            Уже зарегистрированы?
          </Text>
          <Button component={Link} href="/login" size="xl" variant="filled">
            Войти
          </Button>
          <Text c="dimmed">
            Нет интернета или трудно пользоваться сайтом? Позвоните координатору — он примет заявку
            по телефону.
          </Text>
        </Stack>
      </Paper>

      <Text c="dimmed" size="sm" ta="center">
        <Anchor component={Link} href="/register?role=VOLUNTEER">
          Стать волонтёром
        </Anchor>
      </Text>
    </Stack>
  );
}
