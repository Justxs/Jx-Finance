interface MutationState<TVariables, TError> {
  mutateAsync: (variables: TVariables) => Promise<unknown>;
  isPending: boolean;
  error: TError | null;
}

interface PendingState {
  isPending: boolean;
  variables?: { id: string };
}

export const silentMutation = { meta: { silent: true } } as const;

export function notify(success: string) {
  return { meta: { success } };
}

export function pendingId(mutation: PendingState): string | null {
  return mutation.isPending ? (mutation.variables?.id ?? null) : null;
}

export function upsert<TCreate, TUpdate, TError>(
  createMutation: MutationState<TCreate, TError>,
  updateMutation: MutationState<TUpdate, TError>,
) {
  return {
    create: (variables: TCreate) => createMutation.mutateAsync(variables),
    update: (variables: TUpdate) => updateMutation.mutateAsync(variables),
    pending: createMutation.isPending || updateMutation.isPending,
    error: createMutation.error ?? updateMutation.error,
  };
}
