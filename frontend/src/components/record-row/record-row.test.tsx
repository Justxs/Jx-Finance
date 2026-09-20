import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { RecordRow } from "./record-row";

function renderRow(onEdit?: () => void) {
  const onDelete = vi.fn();
  render(
    <ul>
      <RecordRow
        title="Everyday → Savings"
        subtitle="Sep 18, 2026"
        amount="€250.00"
        label="Everyday → Savings"
        onEdit={onEdit}
        onDelete={onDelete}
        deletePending={false}
        deleteDisabled={false}
      />
    </ul>,
  );
  return onDelete;
}

test("names its actions after the record", async () => {
  const onEdit = vi.fn();
  const onDelete = renderRow(onEdit);

  await userEvent.click(screen.getByRole("button", { name: "Edit: Everyday → Savings" }));
  await userEvent.click(screen.getByRole("button", { name: "Delete: Everyday → Savings" }));

  expect(onEdit).toHaveBeenCalledOnce();
  expect(onDelete).toHaveBeenCalledOnce();
});

test("hides the edit action for records that cannot be edited", () => {
  renderRow();

  expect(screen.queryByRole("button", { name: /^Edit/ })).toBeNull();
});
