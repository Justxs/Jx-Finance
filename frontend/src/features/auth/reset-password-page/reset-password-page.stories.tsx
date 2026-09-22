import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getResetPasswordMockHandler } from "@/api/generated/auth/auth.msw";
import { withWidth } from "@/storybook/decorators";
import { resetLink } from "@/storybook/fixtures";
import { pending, withHandlers } from "@/storybook/handlers";
import { ResetPasswordPage } from "./reset-password-page";

const link = `/reset-password?email=${encodeURIComponent(resetLink.email)}&token=${resetLink.token}`;

const meta = {
  title: "Features/Auth/ResetPasswordPage",
  component: ResetPasswordPage,
  parameters: { route: link },
  decorators: [withWidth("auth")],
} satisfies Meta<typeof ResetPasswordPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(resetLink.email)).toBeInTheDocument();
    await expect(canvas.getByLabelText("New password")).toHaveValue("");
  },
};

export const AShortPasswordIsCaughtBeforeSending: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New password"), "short");
    await userEvent.click(canvas.getByRole("button", { name: "Set new password" }));
    await expect(await canvas.findByText("Must be at least 8 characters.")).toBeInTheDocument();
  },
};

export const AUsedLinkIsRefused: Story = {
  parameters: { route: `/reset-password?email=${encodeURIComponent(resetLink.email)}&token=used` },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New password"), "fixture-value-123");
    await userEvent.click(canvas.getByRole("button", { name: "Set new password" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/no longer valid/u);
  },
};

export const AnIncompleteLink: Story = {
  parameters: { route: "/reset-password" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/This link is incomplete/u)).toBeInTheDocument();
    await expect(canvas.queryByLabelText("New password")).not.toBeInTheDocument();
  },
};

export const PendingAfterSubmit: Story = {
  parameters: withHandlers(getResetPasswordMockHandler(pending)),
};
