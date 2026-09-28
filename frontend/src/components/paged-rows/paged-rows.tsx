import type { ReactNode } from "react";
import { type PageRange, Pagination } from "@/components/pagination/pagination";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";

interface Paging {
  page: number;
  setPage: (page: number) => void;
  stale: boolean;
}

interface Props {
  paging: Paging;
  pages: number;
  range?: PageRange;
  count: number;
  emptyText: string;
  children: ReactNode;
}

export function PagedRows({ paging, pages, range, count, emptyText, children }: Readonly<Props>) {
  return (
    <>
      {count === 0 ? (
        <EmptyText>{emptyText}</EmptyText>
      ) : (
        <StaleRegion stale={paging.stale}>
          <Rows>{children}</Rows>
        </StaleRegion>
      )}
      <Pagination page={paging.page} pages={pages} range={range} onPageChange={paging.setPage} />
    </>
  );
}
