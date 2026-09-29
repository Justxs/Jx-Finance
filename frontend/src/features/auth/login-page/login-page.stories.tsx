import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { getLoginMockHandler, getPasskeySignInMockHandler } from "@/api/generated/auth/auth.msw";
import { withWidth } from "@/storybook/decorators";
import {
  loginTwoFactorRequired,
  passkeyInvalidProblem,
  unauthorizedProblem,
} from "@/storybook/fixtures";
import {
  emailEnabledHandler,
  failWith,
  passkeysOffHandler,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { browserWithoutPasskeys, fakePasskeyBrowser } from "@/storybook/passkeys";
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

export const PasskeyButtonNeedsBrowserSupport: Story = {
  beforeEach: browserWithoutPasskeys,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Sign in with a passkey" })).toBeNull();
  },
};

export const PasskeyButtonHiddenOnAnUnsuitableAddress: Story = {
  beforeEach: fakePasskeyBrowser(),
  parameters: withHandlers(passkeysOffHandler),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Sign in with a passkey" })).toBeNull();
  },
};

export const PasskeyRefused: Story = {
  beforeEach: fakePasskeyBrowser(),
  parameters: withHandlers(getPasskeySignInMockHandler(failWith(passkeyInvalidProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Sign in with a passkey" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "The passkey could not be verified.",
    );
  },
};

export const PasskeyCancelledQuietly: Story = {
  beforeEach: fakePasskeyBrowser("cancelled"),
  play: async ({ canvas }) => {
    const button = await canvas.findByRole("button", { name: "Sign in with a passkey" });
    await userEvent.click(button);
    await waitFor(() => expect(button).toBeEnabled());
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const PasskeyOfferedOnTheCodeStep: Story = {
  beforeEach: fakePasskeyBrowser(),
  parameters: withHandlers(getLoginMockHandler(loginTwoFactorRequired)),
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText("Email"), "ruta@example.lt");
    await userEvent.type(canvas.getByLabelText("Password"), "fixture-value");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByLabelText("Authenticator code")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Use a passkey instead" })).toBeVisible();
  },
};
