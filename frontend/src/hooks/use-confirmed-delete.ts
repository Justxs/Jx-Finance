import { useState } from "react";

interface DeleteMutation {
  mutate: (variables: { id: string }) => void;
  isPending: boolean;
  variables?: { id: string };
}

export function useConfirmedDelete<T extends { id: string }>(
  mutation: DeleteMutation,
  items: readonly T[],
  labelOf: (item: T) => string | null | undefined,
) {
  const [target, setTarget] = useState<string | null>(null);
  const item = items.find((candidate) => candidate.id === target);

  return {
    request: (id: string) => setTarget(id),
    pendingId: mutation.isPending ? mutation.variables?.id : undefined,
    busy: mutation.isPending,
    dialogProps: {
      target,
      itemLabel: (item ? labelOf(item) : undefined) ?? undefined,
      onCancel: () => setTarget(null),
      onConfirm: (id: string) => mutation.mutate({ id }),
    },
  };
}
