import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getLoginMockHandler } from "@/api/generated/auth/auth.msw";
import { getPublicSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { loginTwoFactorRequired, settings, unauthorizedProblem } from "@/storybook/fixtures";
import { failWith, handlers, pending } from "@/storybook/handlers";
import { LoginPage } from "./login-page";

const meta = {
  title: "Features/Auth/LoginPage",
  component: LoginPage,
  parameters: { route: "/login" },
  render: () => (
    <div className="flex w-96 max-w-full justify-center">
      <LoginPage />
    </div>
  ),
} satisfies Meta<typeof LoginPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ForgotPasswordIsOfferedWhenEmailWorks: Story = {
  parameters: {
    msw: {
      handlers: [
        getPublicSettingsMockHandler({
          instanceName: settings.instanceName,
          defaultLanguage: settings.defaultLanguage,
          emailEnabled: true,
        }),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("link", { name: "Forgot your password?" }),
    ).toHaveAttribute("href", "/forgot-password");
  },
};

export const ForgotPasswordIsHiddenWithoutAMailServer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("link", { name: "Forgot your password?" })).toBeNull();
  },
};

export const TwoFactorStepAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [getLoginMockHandler(loginTwoFactorRequired), ...handlers],
    },
  },
};

export const InvalidCredentialsAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [
        getLoginMockHandler(
          failWith(
            { ...unauthorizedProblem, instance: "/api/auth/login", detail: "Invalid credentials." },
            401,
          ),
        ),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Email"), "ruta@example.lt");
    await userEvent.type(canvas.getByLabelText("Password"), "fixture-value");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Invalid credentials.");
  },
};

export const PendingAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [getLoginMockHandler(pending), ...handlers],
    },
  },
};
