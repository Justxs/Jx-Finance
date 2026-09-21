import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  getMeMockHandler,
  getSendVerificationEmailMockHandler,
} from "@/api/generated/auth/auth.msw";
import { getPublicSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import {
  currentUser,
  emailAlreadyVerifiedProblem,
  settings,
  unverifiedUser,
} from "@/storybook/fixtures";
import { failWith, handlers } from "@/storybook/handlers";
import { EmailVerificationBanner } from "./email-verification-banner";

const emailOn = getPublicSettingsMockHandler({
  instanceName: settings.instanceName,
  defaultLanguage: settings.defaultLanguage,
  emailEnabled: true,
});

const meta = {
  title: "Features/Profile/EmailVerificationBanner",
  component: EmailVerificationBanner,
  parameters: {
    layout: "padded",
    route: "/",
    msw: { handlers: [emailOn, getMeMockHandler(unverifiedUser), ...handlers] },
  },
} satisfies Meta<typeof EmailVerificationBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Confirm your email address")).toBeInTheDocument();
    await expect(canvas.getByText(new RegExp(unverifiedUser.email, "u"))).toBeInTheDocument();
  },
};

export const ResendingTheLink: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const resend = await canvas.findByRole("button", { name: "Send the link again" });
    await userEvent.click(resend);
    await waitFor(() => expect(resend).toBeEnabled());
  },
};

export const ResendRefusedBecauseItIsAlreadyConfirmed: Story = {
  parameters: {
    msw: {
      handlers: [
        emailOn,
        getMeMockHandler(unverifiedUser),
        getSendVerificationEmailMockHandler(failWith(emailAlreadyVerifiedProblem, 400)),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Send the link again" }));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Send the link again" })).toBeEnabled(),
    );
  },
};

export const HiddenWhenTheAddressIsConfirmed: Story = {
  parameters: {
    msw: { handlers: [emailOn, getMeMockHandler(currentUser), ...handlers] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.queryByText("Confirm your email address")).not.toBeInTheDocument(),
    );
  },
};

export const HiddenWhenTheInstallationCannotSendEmail: Story = {
  parameters: {
    msw: { handlers: [getMeMockHandler(unverifiedUser), ...handlers] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.queryByText("Confirm your email address")).not.toBeInTheDocument(),
    );
  },
};
