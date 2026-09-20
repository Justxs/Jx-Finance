interface MutationState<TVariables, TError> {
  mutateAsync: (variables: TVariables) => Promise<unknown>;
  isPending: boolean;
  error: TError | null;
}

interface SilentMeta {
  meta: { silent: true };
}

export function silent(): { mutation: SilentMeta };
export function silent<TOptions extends object>(
  options: TOptions,
): { mutation: TOptions & SilentMeta };
export function silent(options?: object) {
  const meta: SilentMeta["meta"] = { silent: true };
  return { mutation: { ...options, meta } };
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
