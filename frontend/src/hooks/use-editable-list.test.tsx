import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { createQueryWrapper } from "@/test/query";
import { useEditableList } from "./use-editable-list";

const goals = [
  { id: "g1", name: "Holiday" },
  { id: "g2", name: "Car" },
];

function setup() {
  const mutate = vi.fn();
  const { Wrapper } = createQueryWrapper();
  const hook = renderHook(
    () => useEditableList(goals, { mutate, isPending: false }, (goal) => goal.name),
    { wrapper: Wrapper },
  );
  return { mutate, ...hook };
}

test("opens the edit modal on a row's item and closes it again", () => {
  const { result } = setup();
  expect(result.current.list).toEqual(goals);
  expect(result.current.editProps.item).toBeNull();

  act(() => result.current.rowProps(goals[1]!).onEdit());
  expect(result.current.editProps.item).toBe(goals[1]);

  act(() => result.current.editProps.onClose());
  expect(result.current.editProps.item).toBeNull();
});

test("keeps the edit modal on the newest copy of the row", () => {
  const { Wrapper } = createQueryWrapper();
  const { result, rerender } = renderHook(
    ({ items }) =>
      useEditableList(items, { mutate: vi.fn(), isPending: false }, (goal) => goal.name),
    { wrapper: Wrapper, initialProps: { items: goals } },
  );

  act(() => result.current.rowProps(goals[1]!).onEdit());
  const refreshed = { id: "g2", name: "Car, renamed elsewhere" };
  rerender({ items: [goals[0]!, refreshed] });

  expect(result.current.editProps.item).toBe(refreshed);
});

test("asks before deleting a row and deletes it on confirm", () => {
  const { result, mutate } = setup();

  act(() => result.current.rowProps(goals[0]!).onDelete());
  expect(result.current.dialogProps.target).toBe("g1");
  expect(result.current.dialogProps.itemLabel).toBe("Holiday");
  expect(mutate).not.toHaveBeenCalled();

  act(() => result.current.dialogProps.onConfirm("g1"));
  expect(mutate).toHaveBeenCalledWith({ id: "g1" });
});
