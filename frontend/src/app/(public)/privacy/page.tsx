import { List, ListItem, Stack, Text, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { FormColumn } from '@/widgets/public-shell';

export const metadata: Metadata = { title: 'Обработка персональных данных' };

/** Черновик для пилота. Итоговый текст утверждает организация-оператор. */
export default function PrivacyPage() {
  return (
    <FormColumn
      title="Обработка персональных данных"
      description="Кратко о том, какие данные мы храним и зачем (152-ФЗ)."
    >
      <Stack gap="md">
        <Title order={3}>Какие данные</Title>
        <List spacing="xs">
          <ListItem>ФИО, телефон и, по желанию, электронная почта.</ListItem>
          <ListItem>
            Адреса для выполнения заявок: улица, дом, квартира, этаж, подсказки про дорогу.
          </ListItem>
          <ListItem>Особенности, которые вы сами укажете, например «хожу с тростью».</ListItem>
          <ListItem>Заявки, сообщения, фото чеков и оценки.</ListItem>
        </List>
        <Title order={3}>Зачем</Title>
        <Text>
          Только чтобы волонтёр и координатор могли выполнить ваши заявки и связаться с вами.
        </Text>
        <Title order={3}>Кто видит</Title>
        <Text>
          Волонтёр видит полный адрес и телефон только после того, как возьмёт вашу заявку. До этого
          — только район и улицу. Родственник видит ваши заявки, только если вы подтвердили связь.
        </Text>
        <Title order={3}>Где хранится</Title>
        <Text>На серверах в России, как требует закон № 152-ФЗ.</Text>
        <Text c="dimmed" size="sm">
          Это рабочий вариант для пилота. Итоговый текст утверждает организация-оператор.
        </Text>
      </Stack>
    </FormColumn>
  );
}
