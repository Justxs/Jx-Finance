import type { MutationFunctionContext, QueryKey } from "@tanstack/react-query";

interface OptimisticContext<TData> {
  previous: TData | undefined;
}

type ClientContext = Pick<MutationFunctionContext, "client">;

interface OptimisticOptions<TData, TVariables> {
  queryKey: QueryKey;
  cancelKey?: QueryKey;
  apply: (previous: TData, variables: TVariables) => TData;
}

export function optimisticUpdate<TData, TVariables = void>({
  queryKey,
  cancelKey = queryKey,
  apply,
}: OptimisticOptions<TData, TVariables>) {
  async function onMutate(
    variables: TVariables,
    { client }: ClientContext,
  ): Promise<OptimisticContext<TData>> {
    await client.cancelQueries({ queryKey: cancelKey });
    const previous = client.getQueryData<TData>(queryKey);
    if (previous !== undefined) {
      client.setQueryData<TData>(queryKey, apply(previous, variables));
    }
    return { previous };
  }

  function onError(
    _error: unknown,
    _variables: TVariables,
    onMutateResult: OptimisticContext<TData> | undefined,
    { client }: ClientContext,
  ) {
    if (onMutateResult?.previous !== undefined) {
      client.setQueryData<TData>(queryKey, onMutateResult.previous);
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

function withoutItem<TItem extends Identified>(
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

export function optimisticRemoval<TItem extends Identified>(queryKey: QueryKey) {
  return optimisticUpdate<TItem[], Identified>({ queryKey, apply: withoutItem });
}

export function optimisticPagedRemoval<TPage extends Paged<Identified>>(
  queryKey: QueryKey,
  cancelKey?: QueryKey,
) {
  return optimisticUpdate<TPage, Identified>({
    queryKey,
    cancelKey,
    apply: withoutPagedItem,
  });
}
