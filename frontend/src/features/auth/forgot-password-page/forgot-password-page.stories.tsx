import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { getForgotPasswordMockHandler } from "@/api/generated/auth/auth.msw";
import { withWidth } from "@/storybook/decorators";
import { pending, withHandlers } from "@/storybook/handlers";
import { ForgotPasswordPage } from "./forgot-password-page";

const meta = {
  title: "Features/Auth/ForgotPasswordPage",
  component: ForgotPasswordPage,
  parameters: { route: "/forgot-password" },
  decorators: [withWidth("auth")],
} satisfies Meta<typeof ForgotPasswordPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TheSameAnswerForAnyAddress: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Email"), "nobody@example.lt");
    await userEvent.click(canvas.getByRole("button", { name: "Send reset link" }));
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      /If that address belongs to an account here/u,
    );
    await expect(canvas.queryByLabelText("Email")).not.toBeInTheDocument();
  },
};

export const AnInvalidAddressIsCaughtBeforeSending: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Email"), "not-an-address");
    await userEvent.click(canvas.getByRole("button", { name: "Send reset link" }));
    await expect(await canvas.findByText("Enter a valid email address.")).toBeInTheDocument();
  },
};

export const PendingAfterSubmit: Story = {
  parameters: withHandlers(getForgotPasswordMockHandler(pending)),
};
