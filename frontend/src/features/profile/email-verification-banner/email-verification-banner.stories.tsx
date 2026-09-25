import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import {
  getMeMockHandler,
  getSendVerificationEmailMockHandler,
} from "@/api/generated/auth/auth.msw";
import { currentUser, emailAlreadyVerifiedProblem, unverifiedUser } from "@/storybook/fixtures";
import { emailEnabledHandler, failWith, withHandlers } from "@/storybook/handlers";
import { EmailVerificationBanner } from "./email-verification-banner";

const meta = {
  title: "Features/Profile/EmailVerificationBanner",
  component: EmailVerificationBanner,
  parameters: {
    layout: "padded",
    route: "/",
    ...withHandlers(emailEnabledHandler, getMeMockHandler(unverifiedUser)),
  },
} satisfies Meta<typeof EmailVerificationBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Confirm your email address")).toBeInTheDocument();
    await expect(canvas.getByText(new RegExp(unverifiedUser.email, "u"))).toBeInTheDocument();
  },
};

export const ResendingTheLink: Story = {
  play: async ({ canvas }) => {
    const resend = await canvas.findByRole("button", { name: "Send the link again" });
    await userEvent.click(resend);
    await waitFor(() => expect(resend).toBeEnabled());
  },
};

export const ResendRefusedBecauseItIsAlreadyConfirmed: Story = {
  parameters: withHandlers(
    emailEnabledHandler,
    getMeMockHandler(unverifiedUser),
    getSendVerificationEmailMockHandler(failWith(emailAlreadyVerifiedProblem)),
  ),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Send the link again" }));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Send the link again" })).toBeEnabled(),
    );
  },
};

export const HiddenWhenTheAddressIsConfirmed: Story = {
  parameters: withHandlers(emailEnabledHandler, getMeMockHandler(currentUser)),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.queryByText("Confirm your email address")).not.toBeInTheDocument(),
    );
  },
};

export const HiddenWhenTheInstallationCannotSendEmail: Story = {
  parameters: withHandlers(getMeMockHandler(unverifiedUser)),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.queryByText("Confirm your email address")).not.toBeInTheDocument(),
    );
  },
};
