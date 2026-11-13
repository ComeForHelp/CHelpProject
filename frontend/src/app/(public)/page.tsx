import { Box, Button, Container, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import {
  IconChecklist,
  IconDots,
  IconHistory,
  IconPackage,
  IconPill,
  IconReceipt,
  IconShieldCheck,
  IconShoppingCart,
  IconUsers,
  IconWalk,
} from '@tabler/icons-react';
import Link from 'next/link';
import { Pill } from '@/shared/ui';
import { publicClasses as c } from '@/widgets/public-shell';

const STEPS = [
  {
    title: 'Оставьте заявку',
    text: 'Опишите, что вам нужно: что купить, куда сходить, когда удобно.',
  },
  { title: 'Откликнется волонтёр', text: 'Проверенный волонтёр из вашего района берёт поручение.' },
  {
    title: 'Подтвердите результат',
    text: 'Волонтёр выполняет задачу, а вы подтверждаете, что всё сделано.',
  },
];

const HELP = [
  {
    icon: IconShoppingCart,
    title: 'Покупка продуктов',
    text: 'Хлеб, молоко, овощи — всё по вашему списку',
  },
  { icon: IconPill, title: 'Покупка лекарств', text: 'Лекарства в аптеке по рецепту или списку' },
  {
    icon: IconReceipt,
    title: 'Бытовые вопросы и ЖКХ',
    text: 'Передача показаний, оплата счетов, обращения в управляющую компанию',
  },
  {
    icon: IconWalk,
    title: 'Сопровождение',
    text: 'Составить компанию по дороге в поликлинику или по делам',
  },
  {
    icon: IconPackage,
    title: 'Доставка',
    text: 'Забрать посылку или принести вещь из другого места',
  },
  { icon: IconDots, title: 'Другие поручения', text: 'Опишите свою просьбу, и волонтёр её увидит' },
];

const TRUST = [
  {
    icon: IconShieldCheck,
    title: 'Проверка волонтёров',
    text: 'Волонтёры проходят проверку координатором, прежде чем брать поручения',
  },
  {
    icon: IconChecklist,
    title: 'Контроль выполнения',
    text: 'Заявка закрывается, только когда получатель подтвердит результат',
  },
  {
    icon: IconHistory,
    title: 'История поручений',
    text: 'Все заявки и их статусы сохраняются и понятны',
  },
  {
    icon: IconUsers,
    title: 'Участие координаторов',
    text: 'Координаторы помогают, если возникают сложности, и принимают заявки по телефону',
  },
];

export default function HomePage() {
  return (
    <>
      <Box className={c.hero}>
        <Container size={1248} px={24}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={56} style={{ alignItems: 'center' }}>
            <Stack gap="lg">
              <Title order={1} fz={{ base: '2.1rem', sm: '2.6rem' }}>
                Помощь рядом, когда она нужна
              </Title>
              <Text fz="1.15rem" c="dimmed" maw="34em">
                «Иду на помощь!» помогает пожилым людям и людям с ограниченной мобильностью во
                Владивостоке находить волонтёров для бытовых поручений: купить продукты, привезти
                лекарства, помочь с документами.
              </Text>
              <Group gap="sm">
                <Button component={Link} href="/register?role=RECIPIENT" size="xl">
                  Мне нужна помощь
                </Button>
                <Button
                  component={Link}
                  href="/register?role=VOLUNTEER"
                  size="xl"
                  variant="outline"
                >
                  Хочу помогать
                </Button>
              </Group>
              <Text c="dimmed">
                Помогаете маме или бабушке?{' '}
                <Link href="/register?role=RELATIVE">Оформляйте заявки за родного</Link>
              </Text>
            </Stack>

            {/* Пример заявки — как это выглядит для получателя */}
            <Box className={c.card} h="auto" aria-label="Пример заявки">
              <Group justify="space-between" mb="sm" wrap="nowrap">
                <Text fw={700}>Заявка № 1042</Text>
                <Pill tone="info" size="md">
                  Волонтёр найден
                </Pill>
              </Group>
              <Text c="dimmed" mb="md">
                Купить хлеб, молоко и творог в магазине рядом с домом.
              </Text>
              <Stack gap="sm">
                {['Заявка создана', 'Волонтёр откликнулся', 'Выполнение и подтверждение'].map(
                  (t, i) => (
                    <Group key={t} gap="sm" wrap="nowrap">
                      <span className={c.step} data-done={i < 2 || undefined}>
                        {i < 2 ? '✓' : i + 1}
                      </span>
                      <Text>{t}</Text>
                    </Group>
                  ),
                )}
              </Stack>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      <Box component="section" id="how" className={c.section} aria-labelledby="how-title">
        <Container size={1248} px={24}>
          <Stack gap={6} mb={36} maw="40em">
            <Title order={2} id="how-title">
              Как это работает
            </Title>
            <Text c="dimmed" fz="1.1rem">
              Три понятных шага от просьбы до результата.
            </Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
            {STEPS.map((s, i) => (
              <Box key={s.title} className={c.card}>
                <Text fw={700} c="brand.7" size="sm" mb={8}>
                  Шаг {i + 1}
                </Text>
                <Title order={3} mb={8}>
                  {s.title}
                </Title>
                <Text c="dimmed">{s.text}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      <Box
        component="section"
        id="who"
        className={`${c.section} ${c.alt}`}
        aria-labelledby="who-title"
      >
        <Container size={1248} px={24}>
          <Stack gap={6} mb={36} maw="40em">
            <Title order={2} id="who-title">
              С чем мы помогаем?
            </Title>
            <Text c="dimmed" fz="1.1rem">
              Сервис рассчитан на пожилых людей и людей с ограниченной мобильностью, которым может
              потребоваться помощь с бытовыми делами.
            </Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {HELP.map(({ icon: Icon, title, text }) => (
              <Box key={title} className={c.card}>
                <span className={c.iconBox} aria-hidden>
                  <Icon size={26} stroke={1.8} />
                </span>
                <Title order={3} mb={8}>
                  {title}
                </Title>
                <Text c="dimmed">{text}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      <Box component="section" id="vol" className={c.section} aria-labelledby="vol-title">
        <Container size={1248} px={24}>
          <Box className={c.cta}>
            <Stack gap="xs">
              <Title order={2} c="white" id="vol-title">
                Хотите стать волонтёром?
              </Title>
              <Text c="white" fw={500}>
                Выбирайте поручения в своём районе и в удобное время. После регистрации координатор
                проверит анкету и откроет вам каталог заявок.
              </Text>
            </Stack>
            <Button
              component={Link}
              href="/register?role=VOLUNTEER"
              size="xl"
              color="white"
              c="brand.7"
            >
              Зарегистрироваться
            </Button>
          </Box>
        </Container>
      </Box>

      <Box
        component="section"
        id="trust"
        className={`${c.section} ${c.alt}`}
        aria-labelledby="trust-title"
      >
        <Container size={1248} px={24}>
          <Stack gap={6} mb={36}>
            <Title order={2} id="trust-title" c="brand.7">
              На чём строится доверие?
            </Title>
            <Text fz="1.1rem">Принципы, по которым работает сервис</Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            {TRUST.map(({ icon: Icon, title, text }) => (
              <Box key={title} className={c.card}>
                <span className={c.iconBox} aria-hidden>
                  <Icon size={26} stroke={1.8} />
                </span>
                <Title order={3} mb={8}>
                  {title}
                </Title>
                <Text c="dimmed">{text}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>
    </>
  );
}
