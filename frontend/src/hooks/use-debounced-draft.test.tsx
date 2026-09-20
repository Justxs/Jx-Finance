import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useDebouncedDraft } from "./use-debounced-draft";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("commits after the wait and shows the draft at once", () => {
  const onCommit = vi.fn();
  const { result } = renderHook(() => useDebouncedDraft("", onCommit, 300));

  act(() => result.current.change("ren"));
  act(() => result.current.change("rent"));
  expect(result.current.draft).toBe("rent");
  expect(onCommit).not.toHaveBeenCalled();

  act(() => {
    vi.advanceTimersByTime(300);
  });
  expect(onCommit).toHaveBeenCalledExactlyOnceWith("rent");
});

test("commits straight away without a wait", () => {
  const onCommit = vi.fn();
  const { result } = renderHook(() => useDebouncedDraft("", onCommit, 0));

  act(() => result.current.change("rent"));

  expect(onCommit).toHaveBeenCalledExactlyOnceWith("rent");
});

test("drops a pending commit when cancelled", () => {
  const onCommit = vi.fn();
  const { result } = renderHook(() => useDebouncedDraft("", onCommit, 300));

  act(() => result.current.change("rent"));
  act(() => result.current.cancel());
  act(() => {
    vi.advanceTimersByTime(300);
  });

  expect(onCommit).not.toHaveBeenCalled();
});

test("follows the committed value when it changes elsewhere", () => {
  const { result, rerender } = renderHook(({ value }) => useDebouncedDraft(value, vi.fn(), 300), {
    initialProps: { value: "rent" },
  });

  rerender({ value: "" });

  expect(result.current.draft).toBe("");
});
