import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { getLoginMockHandler } from "@/api/generated/auth/auth.msw";
import { withWidth } from "@/storybook/decorators";
import { loginTwoFactorRequired, unauthorizedProblem } from "@/storybook/fixtures";
import { emailEnabledHandler, failWith, pending, withHandlers } from "@/storybook/handlers";
import { LoginPage } from "./login-page";

const meta = {
  title: "Features/Auth/LoginPage",
  component: LoginPage,
  parameters: { route: "/login" },
  decorators: [withWidth("auth")],
} satisfies Meta<typeof LoginPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ForgotPasswordIsOfferedWhenEmailWorks: Story = {
  parameters: withHandlers(emailEnabledHandler),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("link", { name: "Forgot your password?" }),
    ).toHaveAttribute("href", "/forgot-password");
  },
};

export const ForgotPasswordIsHiddenWithoutAMailServer: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link", { name: "Forgot your password?" })).toBeNull();
  },
};

export const TwoFactorStepAfterSubmit: Story = {
  parameters: withHandlers(getLoginMockHandler(loginTwoFactorRequired)),
};

export const InvalidCredentialsAfterSubmit: Story = {
  parameters: withHandlers(
    getLoginMockHandler(
      failWith({
        ...unauthorizedProblem,
        instance: "/api/auth/login",
        detail: "Invalid credentials.",
      }),
    ),
  ),
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Email"), "ruta@example.lt");
    await userEvent.type(canvas.getByLabelText("Password"), "fixture-value");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Invalid credentials.");
  },
};

export const PendingAfterSubmit: Story = {
  parameters: withHandlers(getLoginMockHandler(pending)),
};
