import type { ReactNode } from "react";

interface Named {
  id: string;
  name: string;
}

export interface SelectOption<T extends string = string, L extends ReactNode = ReactNode> {
  value: T;
  label: L;
  disabled?: boolean;
  group?: string;
}

export function namedOptions(
  items: readonly Named[],
  blankLabel?: string,
  blankValue = "",
): SelectOption<string, string>[] {
  const options = items.map((item) => ({ value: item.id, label: item.name }));

  return blankLabel === undefined
    ? options
    : [{ value: blankValue, label: blankLabel }, ...options];
}

export function nameById(items: readonly Named[] | undefined) {
  return new Map((items ?? []).map((item) => [item.id, item.name]));
}

export function byId<T extends { id: string }>(items: readonly T[] | undefined) {
  return new Map((items ?? []).map((item) => [item.id, item]));
}

export function withMissingOption(
  options: readonly SelectOption<string, string>[],
  id: string | null | undefined,
  label: string,
): SelectOption<string, string>[] {
  if (!id || options.some((option) => option.value === id)) {
    return [...options];
  }

  return [...options, { value: id, label }];
}

export function optionsOf<T extends string>(values: readonly T[], label: (value: T) => string) {
  return values.map((value) => ({ value, label: label(value) }));
}
