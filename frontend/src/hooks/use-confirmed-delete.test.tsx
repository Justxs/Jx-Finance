import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { createQueryWrapper } from "@/test/query";
import { useConfirmedDelete } from "./use-confirmed-delete";

const goals = [
  { id: "g1", name: "Holiday" },
  { id: "g2", name: null },
];

function setup(mutation: Partial<Parameters<typeof useConfirmedDelete>[0]> = {}) {
  const mutate = vi.fn();
  const { Wrapper } = createQueryWrapper();
  const hook = renderHook(
    () => useConfirmedDelete({ mutate, isPending: false, ...mutation }, goals, (goal) => goal.name),
    { wrapper: Wrapper },
  );
  return { mutate, ...hook };
}

function setupWithUndo() {
  const mutate = vi.fn();
  const { Wrapper } = createQueryWrapper();
  const hook = renderHook(
    () =>
      useConfirmedDelete({ mutate, isPending: false }, goals, (goal) => goal.name, "transaction"),
    { wrapper: Wrapper },
  );
  return { mutate, ...hook };
}

test("asks before deleting and labels the dialog after the item", () => {
  const { result, mutate } = setup();
  expect(result.current.dialogProps.target).toBeNull();

  act(() => result.current.request("g1"));
  expect(result.current.dialogProps.target).toBe("g1");
  expect(result.current.dialogProps.itemLabel).toBe("Holiday");
  expect(mutate).not.toHaveBeenCalled();

  act(() => result.current.dialogProps.onConfirm("g1"));
  expect(mutate).toHaveBeenCalledWith({ id: "g1" });

  act(() => result.current.dialogProps.onCancel());
  expect(result.current.dialogProps.target).toBeNull();
});

test("leaves the label out when the item has none", () => {
  const { result } = setup();

  act(() => result.current.request("g2"));

  expect(result.current.dialogProps.itemLabel).toBeUndefined();
});

test("reports which row is being deleted", () => {
  const idle = setup({ variables: { id: "g1" } });
  expect(idle.result.current.pendingId).toBeUndefined();
  expect(idle.result.current.busy).toBe(false);

  const busy = setup({ isPending: true, variables: { id: "g1" } });
  expect(busy.result.current.pendingId).toBe("g1");
  expect(busy.result.current.busy).toBe(true);
});

test("a restorable kind offers an undo toast once the delete succeeded", () => {
  const { result, mutate } = setupWithUndo();

  act(() => result.current.request("g1"));
  act(() => result.current.dialogProps.onConfirm("g1"));

  expect(mutate).toHaveBeenCalledWith({ id: "g1" }, { onSuccess: expect.any(Function) });
});
