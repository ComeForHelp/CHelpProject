'use client';

import { Badge, Group, Stack, Text } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { S } from '@/shared/api/types';

export type Address = S['AddressDto'];
export type District = S['DistrictDto'];

export function useDistricts() {
  return useQuery({
    queryKey: ['dictionaries', 'districts'],
    queryFn: async () => (await api.get<District[]>('/dictionaries/districts')).data,
    staleTime: Infinity,
  });
}

export const addressKeys = {
  list: (recipientId?: string) => ['addresses', recipientId ?? 'me'] as const,
};

export function useAddresses(recipientId?: string) {
  return useQuery({
    queryKey: addressKeys.list(recipientId),
    queryFn: async () =>
      (await api.get<Address[]>('/addresses', { params: recipientId ? { recipientId } : {} })).data,
  });
}

/** Адрес одной строкой: «ул. Светланская, 45, кв. 12». */
export function addressLine(a: {
  street: string;
  house?: string;
  apartment?: string | null;
  entrance?: string | null;
}): string {
  return [
    a.street,
    a.house,
    a.entrance ? `подъезд ${a.entrance}` : null,
    a.apartment ? `кв. ${a.apartment}` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

/** «5 этаж, без лифта» */
export function floorLine(a: { floor?: number | null; hasElevator?: boolean }): string | null {
  if (a.floor === null || a.floor === undefined) return a.hasElevator ? 'есть лифт' : null;
  return `${a.floor} этаж, ${a.hasElevator ? 'есть лифт' : 'без лифта'}`;
}

/** AddressView: район, адрес, этаж и подсказки про дорогу (что пришло — то и показываем). */
export function AddressView({
  address,
}: {
  address: {
    district: District;
    street: string;
    house?: string;
    apartment?: string | null;
    entrance?: string | null;
    floor?: number | null;
    hasElevator?: boolean;
    accessNotes?: string | null;
    label?: string | null;
  };
}) {
  const floor = floorLine(address);
  const noElevator = (address.floor ?? 0) > 1 && !address.hasElevator;
  return (
    <Stack gap={4}>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <IconMapPin size={22} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
        <Stack gap={2}>
          <Text fw={600}>{addressLine(address)}</Text>
          <Text c="dimmed">{address.district.name} район</Text>
        </Stack>
      </Group>
      {floor && (
        <Group gap="xs">
          <Text>{floor}</Text>
          {noElevator && (
            <Badge color="orange" c="orange.9">
              Без лифта
            </Badge>
          )}
        </Group>
      )}
      {address.accessNotes && <Text c="dimmed">{address.accessNotes}</Text>}
    </Stack>
  );
}
