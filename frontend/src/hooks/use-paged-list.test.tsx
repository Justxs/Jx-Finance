import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { usePageClamp, usePagedList } from "./use-paged-list";

function usePaged(total: number) {
  const paging = usePagedList();
  const pages = usePageClamp(paging, total, 10);
  return { ...paging, pages };
}

test("starts on the first page and is not stale", () => {
  const { result } = renderHook(() => usePaged(35));

  expect(result.current.page).toBe(1);
  expect(result.current.shownPage).toBe(1);
  expect(result.current.stale).toBe(false);
  expect(result.current.pages).toBe(4);
});

test("always has at least one page", () => {
  const { result } = renderHook(() => usePaged(0));

  expect(result.current.pages).toBe(1);
});

test("pulls the page back when the list shrinks", () => {
  const { result, rerender } = renderHook(({ total }) => usePaged(total), {
    initialProps: { total: 35 },
  });

  act(() => result.current.setPage(4));
  expect(result.current.page).toBe(4);

  rerender({ total: 12 });
  expect(result.current.page).toBe(2);
  expect(result.current.pages).toBe(2);
});
