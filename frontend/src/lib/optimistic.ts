import type { QueryClient, QueryKey } from "@tanstack/react-query";

export interface OptimisticContext<TData> {
  previous: TData | undefined;
}

interface OptimisticOptions<TData, TVariables> {
  queryClient: QueryClient;
  queryKey: QueryKey;
  cancelKey?: QueryKey;
  apply: (previous: TData, variables: TVariables) => TData;
}

export function optimisticUpdate<TData, TVariables = void>({
  queryClient,
  queryKey,
  cancelKey = queryKey,
  apply,
}: OptimisticOptions<TData, TVariables>) {
  async function onMutate(variables: TVariables): Promise<OptimisticContext<TData>> {
    await queryClient.cancelQueries({ queryKey: cancelKey });
    const previous = queryClient.getQueryData<TData>(queryKey);
    if (previous !== undefined) {
      queryClient.setQueryData<TData>(queryKey, apply(previous, variables));
    }
    return { previous };
  }

  function onError(
    _error: unknown,
    _variables: TVariables,
    context: OptimisticContext<TData> | undefined,
  ) {
    if (context?.previous !== undefined) {
      queryClient.setQueryData<TData>(queryKey, context.previous);
    }
  }

  return { onMutate, onError };
}

interface Identified {
  id: string;
}

interface Paged<TItem> {
  items: TItem[];
  total: number;
}

export function withoutItem<TItem extends Identified>(
  list: readonly TItem[],
  { id }: Identified,
): TItem[] {
  return list.filter((item) => item.id !== id);
}

export function withoutPagedItem<TItem extends Identified, TPage extends Paged<TItem>>(
  page: TPage,
  { id }: Identified,
): TPage {
  const items = page.items.filter((item) => item.id !== id);
  return { ...page, items, total: page.total - (page.items.length - items.length) };
}

export function optimisticRemoval<TItem extends Identified>(
  queryClient: QueryClient,
  queryKey: QueryKey,
) {
  return optimisticUpdate<TItem[], Identified>({ queryClient, queryKey, apply: withoutItem });
}

export function optimisticPagedRemoval<TPage extends Paged<Identified>>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  cancelKey?: QueryKey,
) {
  return optimisticUpdate<TPage, Identified>({
    queryClient,
    queryKey,
    cancelKey,
    apply: withoutPagedItem,
  });
}
