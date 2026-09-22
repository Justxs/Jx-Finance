interface Named {
  id: string;
  name: string;
}

export interface NamedOption {
  value: string;
  label: string;
}

export function namedOptions(
  items: readonly Named[],
  blankLabel?: string,
  blankValue = "",
): NamedOption[] {
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
  options: readonly NamedOption[],
  id: string | null | undefined,
  label: string,
): NamedOption[] {
  if (!id || options.some((option) => option.value === id)) {
    return [...options];
  }

  return [...options, { value: id, label }];
}
