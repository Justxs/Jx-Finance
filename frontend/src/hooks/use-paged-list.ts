import { useDeferredValue, useState } from "react";

interface PageState {
  page: number;
  setPage: (page: number) => void;
}

export function usePageClamp({ page, setPage }: PageState, total: number, pageSize: number) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  if (page > pages) {
    setPage(pages);
  }

  return pages;
}

export function usePagedList() {
  const [page, setPage] = useState(1);
  const shownPage = useDeferredValue(page);

  return { page, setPage, shownPage, stale: shownPage !== page };
}

interface PagedData<T> {
  items: T[];
  total: number;
}

export function usePagedItems<T>(
  paging: PageState,
  data: PagedData<T> | undefined,
  pageSize: number,
) {
  const pages = usePageClamp(paging, data?.total ?? 0, pageSize);
  const items = useDeferredValue(data?.items) ?? [];

  return { items, pages };
}
