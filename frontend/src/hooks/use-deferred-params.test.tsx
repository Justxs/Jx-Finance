import { renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { useDeferredParams } from "./use-deferred-params";

test("returns the params as given when nothing is pending", () => {
  const params = { page: 1, search: "lidl" };

  const { result } = renderHook(() => useDeferredParams(params));

  expect(result.current).toEqual([params, false]);
  expect(result.current[0]).toBe(params);
});

test("settles on new params after a change", () => {
  const { result, rerender } = renderHook((params) => useDeferredParams(params), {
    initialProps: { page: 1 },
  });

  rerender({ page: 2 });

  expect(result.current).toEqual([{ page: 2 }, false]);
});

test("an equal object with a new identity is not stale", () => {
  const { result, rerender } = renderHook((params) => useDeferredParams(params), {
    initialProps: { page: 1 },
  });
  const next = { page: 1 };

  rerender(next);

  expect(result.current[1]).toBe(false);
  expect(result.current[0]).toBe(next);
});
