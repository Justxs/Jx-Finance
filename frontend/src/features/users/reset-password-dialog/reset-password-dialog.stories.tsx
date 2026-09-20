import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { getResetUserPasswordMockHandler } from "@/api/generated/users/users.msw";
import {
  adminPassword,
  lockedOutProblem,
  longNameUser,
  memberUser,
  notFoundProblem,
  weakPasswordProblem,
} from "@/storybook/fixtures";
import { failWith, failWithStatus, handlers, pending } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { ResetPasswordDialog } from "./reset-password-dialog";

const meta = {
  title: "Features/Users/ResetPasswordDialog",
  component: ResetPasswordDialog,
  args: { user: memberUser, onClose: fn() },
} satisfies Meta<typeof ResetPasswordDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

async function submitReset(currentPassword = adminPassword) {
  const dialog = within(await openedDialog());
  const submit = dialog.getByRole("button", { name: "Reset password" });
  fireEvent.change(dialog.getByLabelText("Temporary password"), {
    target: { value: "Temporary-42-horse" },
  });
  fireEvent.change(dialog.getByLabelText("Your current password"), {
    target: { value: currentPassword },
  });
  await waitFor(() => expect(submit).toBeEnabled());
  await userEvent.click(submit);
  return dialog;
}

export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const LongName: Story = { args: { user: longNameUser } };

export const Closed: Story = { args: { user: null } };

export const RejectsShortPassword: Story = {
  play: async () => {
    const dialog = within(await openedDialog());
    const field = dialog.getByLabelText("Temporary password");
    fireEvent.change(field, { target: { value: "short" } });
    fireEvent.blur(field);

    await expect(await dialog.findByText(/at least 8/iu)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Reset password" })).toBeDisabled();
  },
};

export const ResetsPasswordAndTwoFactor: Story = {
  play: async ({ args }) => {
    const dialog = within(await openedDialog());
    await userEvent.click(
      dialog.getByRole("checkbox", { name: "Also reset two-factor authentication" }),
    );
    await submitReset();

    await expect(
      await within(document.body).findByText(/Password reset\. Šarūnas Kazlauskas/u),
    ).toBeInTheDocument();
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const Pending: Story = {
  parameters: { msw: { handlers: [getResetUserPasswordMockHandler(pending), ...handlers] } },
  play: async () => {
    const dialog = await submitReset();

    await waitFor(() =>
      expect(dialog.getByRole("button", { name: "Reset password" })).toHaveAttribute(
        "aria-busy",
        "true",
      ),
    );
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  },
};

export const WrongCurrentPassword: Story = {
  play: async ({ args }) => {
    const dialog = await submitReset("not-my-password");

    await expect(await dialog.findByText("The current password is wrong.")).toBeVisible();
    await expect(dialog.getByLabelText("Your current password")).toHaveValue("");
    await expect(dialog.getByLabelText("Temporary password")).toHaveValue("Temporary-42-horse");
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const WeakPassword: Story = {
  parameters: {
    msw: {
      handlers: [getResetUserPasswordMockHandler(failWith(weakPasswordProblem, 400)), ...handlers],
    },
  },
  play: async () => {
    const dialog = await submitReset();

    const field = dialog.getByLabelText("Temporary password");
    await waitFor(() => expect(field).toHaveAttribute("aria-invalid", "true"));
    await expect(dialog.getByText("Choose a stronger password.")).toBeVisible();
  },
};

export const LockedOut: Story = {
  parameters: {
    msw: {
      handlers: [getResetUserPasswordMockHandler(failWith(lockedOutProblem, 429)), ...handlers],
    },
  },
  play: async () => {
    const dialog = await submitReset();

    await expect(await dialog.findByText(/Wait 15 minutes and try again/u)).toBeVisible();
  },
};

export const ThrottledWithoutBody: Story = {
  parameters: {
    msw: { handlers: [getResetUserPasswordMockHandler(failWithStatus(429)), ...handlers] },
  },
  play: async () => {
    const dialog = await submitReset();

    await expect(
      await dialog.findByText("Too many attempts. Wait a moment and try again."),
    ).toBeVisible();
  },
};

export const UserNoLongerExists: Story = {
  parameters: {
    msw: {
      handlers: [getResetUserPasswordMockHandler(failWith(notFoundProblem, 404)), ...handlers],
    },
  },
  play: async () => {
    const dialog = await submitReset();

    await expect(await dialog.findByRole("alert")).toBeVisible();
  },
};
