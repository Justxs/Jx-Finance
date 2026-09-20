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
