import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

test("stays closed without a target", () => {
  render(<ConfirmDeleteDialog target={null} onCancel={vi.fn()} onConfirm={vi.fn()} />);

  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

test("names what is about to be deleted", () => {
  render(
    <ConfirmDeleteDialog
      target={{ id: "a" }}
      itemLabel="Swedbank"
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
    />,
  );

  expect(screen.getByRole("alertdialog")).toHaveAccessibleDescription(/Swedbank/);
});

test("confirming passes the target on and closes", async () => {
  const target = { id: "a" };
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<ConfirmDeleteDialog target={target} onCancel={onCancel} onConfirm={onConfirm} />);

  await userEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(onConfirm).toHaveBeenCalledExactlyOnceWith(target);
  expect(onCancel).toHaveBeenCalledOnce();
});

test("cancelling deletes nothing", async () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<ConfirmDeleteDialog target="a" onCancel={onCancel} onConfirm={onConfirm} />);

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onCancel).toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();
});

test("escape cancels", async () => {
  const onCancel = vi.fn();
  render(<ConfirmDeleteDialog target="a" onCancel={onCancel} onConfirm={vi.fn()} />);

  await userEvent.keyboard("{Escape}");

  expect(onCancel).toHaveBeenCalled();
});
