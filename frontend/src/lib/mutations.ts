interface MutationState<TVariables, TError> {
  mutateAsync: (variables: TVariables) => Promise<unknown>;
  isPending: boolean;
  error: TError | null;
}

interface PendingState {
  isPending: boolean;
  variables?: { id: string };
}

interface Meta {
  silent?: true;
  success?: string;
}

interface SilentMeta {
  meta: { silent: true };
}

export const silentQuery = { retry: false, throwOnError: false, meta: { silent: true } } as const;

export function silent(): { mutation: SilentMeta };
export function silent<TOptions extends object>(
  options: TOptions,
): { mutation: TOptions & SilentMeta };
export function silent(options: { meta?: Meta } = {}) {
  const meta: Meta = { ...options.meta, silent: true };
  return { mutation: { ...options, meta } };
}

export function notify(success: string) {
  return { mutation: { meta: { success } } };
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
