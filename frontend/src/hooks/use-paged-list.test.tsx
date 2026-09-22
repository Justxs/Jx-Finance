import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { usePageClamp, usePagedItems, usePagedList } from "./use-paged-list";

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

test("usePagedItems exposes the items and the clamped page count", () => {
  const { result } = renderHook(() => {
    const paging = usePagedList();
    return usePagedItems(paging, { items: ["a", "b"], total: 12 }, 10);
  });

  expect(result.current.items).toEqual(["a", "b"]);
  expect(result.current.pages).toBe(2);
});

test("usePagedItems treats missing data as an empty first page", () => {
  const { result } = renderHook(() => {
    const paging = usePagedList();
    return usePagedItems<string>(paging, undefined, 10);
  });

  expect(result.current.items).toEqual([]);
  expect(result.current.pages).toBe(1);
});
