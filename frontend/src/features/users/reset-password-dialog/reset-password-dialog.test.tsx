import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { memberUser } from "@/storybook/fixtures";
import { renderWithQuery } from "@/test/query";
import { ResetPasswordDialog } from "./reset-password-dialog";

test("names the user and warns that the password is not sent to them", () => {
  renderWithQuery(<ResetPasswordDialog user={memberUser} onClose={vi.fn()} />);

  expect(screen.getByRole("heading", { name: "Set a temporary password" })).toBeInTheDocument();
  expect(screen.getByText(/pass it on yourself/u)).toHaveTextContent(memberUser.displayName);
  expect(screen.getByRole("checkbox", { name: /two-factor/u })).not.toBeChecked();
});

test("renders nothing without a user", () => {
  renderWithQuery(<ResetPasswordDialog user={null} onClose={vi.fn()} />);

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
