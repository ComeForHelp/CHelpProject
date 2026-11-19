'use client';

import {
  type DefaultError,
  type MutateOptions,
  type UseMutationOptions,
  useMutation,
} from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

/**
 * Защита от двойного нажатия. Флаг в ref ставится сразу в момент клика, поэтому второй клик
 * в том же кадре (до того, как кнопка перерисуется с loading) тоже игнорируется.
 */
export function useActionLock() {
  const locked = useRef(false);
  const acquire = useCallback(() => {
    if (locked.current) return false;
    locked.current = true;
    return true;
  }, []);
  const release = useCallback(() => {
    locked.current = false;
  }, []);
  return { acquire, release };
}

/**
 * useMutation, у которого mutate() не запускается повторно, пока предыдущий вызов не завершился:
 * двойное «Отправить», «Взять», «Назначить» не создаст двух запросов.
 * Не подходит там, где несколько независимых действий идут параллельно (отметки в списке покупок).
 */
export function useGuardedMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(options: UseMutationOptions<TData, TError, TVariables, TContext>) {
  const mutation = useMutation(options);
  const { acquire, release } = useActionLock();
  const { mutate: rawMutate } = mutation;

  const mutate = useCallback(
    (variables: TVariables, opts?: MutateOptions<TData, TError, TVariables, TContext>) => {
      if (!acquire()) return;
      rawMutate(variables, {
        ...opts,
        onSettled: (...args) => {
          release();
          opts?.onSettled?.(...args);
        },
      });
    },
    [acquire, release, rawMutate],
  );

  return { ...mutation, mutate };
}
