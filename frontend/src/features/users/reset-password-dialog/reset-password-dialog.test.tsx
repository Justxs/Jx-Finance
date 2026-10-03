import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { getResetUserPasswordMockHandler } from "@/api/generated/users/users.msw";
import { adminPassword, memberUser, weakPasswordProblem } from "@/storybook/fixtures";
import { failWith } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { mockApi, renderInApp } from "@/test/api";
import { ResetPasswordDialog } from "./reset-password-dialog";

const api = mockApi();
const resetPath = `/api/users/${memberUser.id}/reset-password`;

async function fillIn(temporary: string, current: string) {
  const dialog = within(await openedDialog());
  fireEvent.change(dialog.getByLabelText("Temporary password"), { target: { value: temporary } });
  fireEvent.change(dialog.getByLabelText("Your current password"), { target: { value: current } });
  return dialog;
}

async function submit(dialog: ReturnType<typeof within>) {
  const button = dialog.getByRole("button", { name: "Reset password" });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
}

test("the reset sends both passwords and the two-factor choice, then closes with a notice", async () => {
  const onClose = vi.fn();
  renderInApp(<ResetPasswordDialog user={memberUser} onClose={onClose} />, { path: "/users" });

  const dialog = await fillIn("Temporary-42-horse", adminPassword);
  fireEvent.click(
    dialog.getByRole("checkbox", { name: "Also reset two-factor authentication and passkeys" }),
  );
  await submit(dialog);

  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(
    await screen.findByText(
      `Password reset. ${memberUser.displayName} has been signed out everywhere.`,
    ),
  ).toBeInTheDocument();
  expect(await api.lastBody("POST", resetPath)).toEqual({
    newPassword: "Temporary-42-horse",
    resetTwoFactor: true,
    currentPassword: adminPassword,
  });
});

test("a wrong own password empties only that field and keeps the dialog open", async () => {
  const onClose = vi.fn();
  renderInApp(<ResetPasswordDialog user={memberUser} onClose={onClose} />, { path: "/users" });

  const dialog = await fillIn("Temporary-42-horse", "not-my-password");
  await submit(dialog);

  expect(await dialog.findByText("The current password is wrong.")).toBeInTheDocument();
  expect(dialog.getByLabelText("Your current password")).toHaveValue("");
  expect(dialog.getByLabelText("Temporary password")).toHaveValue("Temporary-42-horse");
  expect(onClose).not.toHaveBeenCalled();
});

test("a short temporary password blocks the reset", async () => {
  renderInApp(<ResetPasswordDialog user={memberUser} onClose={vi.fn()} />, { path: "/users" });

  const dialog = await fillIn("short", adminPassword);
  fireEvent.blur(dialog.getByLabelText("Temporary password"));

  expect(await dialog.findByText("Must be at least 8 characters.")).toBeInTheDocument();
  expect(dialog.getByRole("button", { name: "Reset password" })).toBeDisabled();
  expect(api.sent("POST", resetPath)).toHaveLength(0);
});

test("a password the server finds weak is reported on the temporary password field", async () => {
  api.use(getResetUserPasswordMockHandler(failWith(weakPasswordProblem)));
  renderInApp(<ResetPasswordDialog user={memberUser} onClose={vi.fn()} />, { path: "/users" });

  const dialog = await fillIn("temporary-password", adminPassword);
  await submit(dialog);

  await waitFor(() => expect(dialog.getByLabelText("Temporary password")).toBeInvalid());
  expect(dialog.getByText("Choose a stronger password.")).toBeInTheDocument();
});
