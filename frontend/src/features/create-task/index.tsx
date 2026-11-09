'use client';

import { Alert, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconArrowRight, IconSend } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAddresses } from '@/entities/address';
import { useCategories } from '@/entities/category';
import { taskKeys } from '@/entities/task';
import { api } from '@/shared/api/client';
import { getErrorMessage } from '@/shared/api/errors';
import type { S } from '@/shared/api/types';
import { ErrorBlock, LoadingBlock, StepIndicator, confirmAction } from '@/shared/ui';
import {
  STEP_TITLES,
  type StepId,
  draftToPayload,
  emptyDraft,
  stepsFor,
  useTaskDrafts,
  validateStep,
} from './model';
import {
  AddressStep,
  CategoryStep,
  DetailsStep,
  PaymentStep,
  ReviewStep,
  TimeStep,
  type StepProps,
} from './steps';

export { ShoppingListEditor } from './steps';

const STEP_COMPONENTS: Record<
  Exclude<StepId, 'review' | 'category'>,
  React.ComponentType<StepProps>
> = {
  details: DetailsStep,
  time: TimeStep,
  address: AddressStep,
  payment: PaymentStep,
};

/** Общая часть мастера и одноэкранной формы: черновик, адрес по умолчанию, отправка. */
function useTaskForm(recipientId: string | undefined, basePath: string) {
  const key = recipientId ?? 'me';
  const draft = useTaskDrafts((s) => s.drafts[key]) ?? emptyDraft();
  const updateDraft = useTaskDrafts((s) => s.update);
  const resetDraft = useTaskDrafts((s) => s.reset);
  const categories = useCategories();
  const addresses = useAddresses(recipientId);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<typeof draft>) => {
    setError(null);
    updateDraft(key, patch);
  };
  const category = categories.data?.find((c) => c.id === draft.categoryId);
  const steps = useMemo(() => stepsFor(category), [category]);

  // Основной адрес подставляем сам — пожилому человеку не нужно выбирать единственный вариант.
  useEffect(() => {
    if (draft.addressId && addresses.data?.some((a) => a.id === draft.addressId)) return;
    const def = addresses.data?.find((a) => a.isDefault) ?? addresses.data?.[0];
    if (def) updateDraft(key, { addressId: def.id });
  }, [addresses.data, draft.addressId, key, updateDraft]);

  const submit = async () => {
    for (const step of steps) {
      const msg = validateStep(step, draft);
      if (msg) {
        setError(msg);
        update({ step: steps.indexOf(step) });
        return;
      }
    }
    setSubmitting(true);
    try {
      const { data } = await api.post<S['TaskDetailDto']>(
        '/tasks',
        draftToPayload(draft, category, recipientId),
      );
      resetDraft(key);
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
      notifications.show({
        color: 'green',
        title: 'Заявка отправлена',
        message: 'Как только волонтёр её возьмёт, вы увидите это здесь.',
      });
      router.push(`${basePath}/tasks/${data.id}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    key,
    draft,
    update,
    resetDraft,
    categories,
    category,
    steps,
    submit,
    submitting,
    error,
    setError,
  };
}

/**
 * TaskWizard — пошаговая форма заявки: один вопрос на экран, «Назад» на каждом шаге,
 * черновик не теряется (хранится в браузере).
 */
export function TaskWizard({ recipientId, basePath }: { recipientId?: string; basePath: string }) {
  const router = useRouter();
  const f = useTaskForm(recipientId, basePath);
  const headingRef = useRef<HTMLDivElement>(null);
  const stepIndex = Math.min(f.draft.step, f.steps.length - 1);
  const step = f.steps[stepIndex];

  // При смене шага переводим фокус на заголовок — экранный диктор прочитает новый вопрос.
  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex]);

  if (f.categories.isPending) return <LoadingBlock />;
  if (f.categories.error)
    return <ErrorBlock error={f.categories.error} onRetry={() => f.categories.refetch()} />;
  const categories = f.categories.data ?? [];

  const goTo = (i: number) => {
    f.setError(null);
    f.update({ step: Math.max(0, Math.min(i, f.steps.length - 1)) });
  };
  const next = () => {
    const msg = validateStep(step, f.draft);
    if (msg) return f.setError(msg);
    goTo(stepIndex + 1);
  };
  const back = () => (stepIndex === 0 ? router.push(basePath) : goTo(stepIndex - 1));

  const props: StepProps = { draft: f.draft, update: f.update, categories, recipientId };

  return (
    <Stack gap="xl">
      <div ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>
        <StepIndicator step={stepIndex + 1} total={f.steps.length} title={STEP_TITLES[step]} />
      </div>

      {step === 'category' && <CategoryStep {...props} onPicked={() => goTo(1)} />}
      {step === 'review' && <ReviewStep {...props} goTo={(s) => goTo(f.steps.indexOf(s))} />}
      {step !== 'category' &&
        step !== 'review' &&
        (() => {
          // Шаг — именно компонент (<Step />), а не вызов функции: у шагов свои хуки
          const Step = STEP_COMPONENTS[step];
          return <Step key={step} {...props} />;
        })()}

      {f.error && (
        <Alert color="red" c="red.9" role="alert">
          {f.error}
        </Alert>
      )}

      <Group justify="space-between" gap="md" wrap="nowrap">
        <Button
          variant="default"
          size="xl"
          leftSection={<IconArrowLeft aria-hidden />}
          onClick={back}
        >
          Назад
        </Button>
        {step === 'review' ? (
          <Button
            size="xl"
            color="green"
            rightSection={<IconSend aria-hidden />}
            onClick={f.submit}
            loading={f.submitting}
          >
            Отправить заявку
          </Button>
        ) : (
          step !== 'category' && (
            <Button size="xl" rightSection={<IconArrowRight aria-hidden />} onClick={next}>
              Далее
            </Button>
          )
        )}
      </Group>

      {(f.draft.categoryId || f.draft.title) && (
        <Button
          variant="subtle"
          color="gray"
          size="md"
          style={{ alignSelf: 'center' }}
          onClick={() =>
            confirmAction({
              title: 'Начать заново?',
              message: 'Всё, что вы заполнили, сотрётся.',
              confirmLabel: 'Да, начать заново',
              danger: true,
              onConfirm: () => f.resetDraft(f.key),
            })
          }
        >
          Начать заново
        </Button>
      )}
    </Stack>
  );
}

function Block({ id, children }: { id: StepId; children: React.ReactNode }) {
  return (
    <Paper withBorder p="lg" radius="md">
      <Stack gap="md">
        <Title order={3}>{STEP_TITLES[id]}</Title>
        {children}
      </Stack>
    </Paper>
  );
}

/** Та же форма одним экраном — для координатора, принимающего заявку по телефону. */
export function TaskFormSingle({
  recipientId,
  basePath,
}: {
  recipientId: string;
  basePath: string;
}) {
  const f = useTaskForm(recipientId, basePath);
  if (f.categories.isPending) return <LoadingBlock />;
  const categories = f.categories.data ?? [];
  const props: StepProps = { draft: f.draft, update: f.update, categories, recipientId };

  return (
    <Stack gap="md">
      <Block id="category">
        <CategoryStep {...props} />
      </Block>
      {f.draft.categoryId && (
        <>
          <Block id="details">
            <DetailsStep {...props} />
          </Block>
          <Block id="time">
            <TimeStep {...props} />
          </Block>
          <Block id="address">
            <AddressStep {...props} />
          </Block>
          {f.category?.needsMoney && (
            <Block id="payment">
              <PaymentStep {...props} />
            </Block>
          )}
        </>
      )}
      {f.error && (
        <Alert color="red" c="red.9" role="alert">
          {f.error}
        </Alert>
      )}
      <Group justify="flex-end">
        <Text c="dimmed">Черновик сохраняется автоматически</Text>
        <Button
          size="xl"
          color="green"
          leftSection={<IconSend aria-hidden />}
          onClick={f.submit}
          loading={f.submitting}
        >
          Создать заявку
        </Button>
      </Group>
    </Stack>
  );
}
