import { renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { useRetained } from "./use-retained";

test("keeps the last value while the source is empty", () => {
  const initialProps: { value: string | null } = { value: "first" };
  const { result, rerender } = renderHook(({ value }) => useRetained(value), { initialProps });

  rerender({ value: null });
  expect(result.current).toBe("first");

  rerender({ value: "second" });
  expect(result.current).toBe("second");
});

test("follows an explicit keep flag instead of emptiness", () => {
  const initialProps: { value: string | undefined; keep: boolean } = {
    value: "label",
    keep: false,
  };
  const { result, rerender } = renderHook(({ value, keep }) => useRetained(value, keep), {
    initialProps,
  });

  rerender({ value: undefined, keep: true });
  expect(result.current).toBe("label");

  rerender({ value: undefined, keep: false });
  expect(result.current).toBeUndefined();
});
