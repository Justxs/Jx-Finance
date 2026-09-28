import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor } from "storybook/test";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import {
  getMyDiscordMockHandler,
  getTestMyDiscordMockHandler,
} from "@/api/generated/users/users.msw";
import {
  discordWebhookGoneProblem,
  emailSubscriber,
  myDiscordEmpty,
  myDiscordFailing,
  myDiscordGone,
  myDiscordUnreadable,
  unverifiedUser,
} from "@/storybook/fixtures";
import {
  discordOffHandler,
  emailEnabledHandler,
  failWith,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { NotificationsSection } from "./notifications-section";

const meta = {
  title: "Features/Profile/NotificationsSection",
  component: NotificationsSection,
  parameters: { layout: "padded", route: "/profile" },
} satisfies Meta<typeof NotificationsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const webhook = "https://discord.com/api/webhooks/123456789012345678/abc-DEF_123";

export const Configured: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Webhook URL")).toHaveValue("");
    await expect(
      canvas.getByRole("checkbox", { name: "A recurring entry is due on Discord" }),
    ).toBeChecked();
    await expect(
      canvas.getByRole("checkbox", { name: "A budget reaches 80% on Discord" }),
    ).not.toBeChecked();
    await expect(canvas.getByText(/Last message delivered/u)).toBeInTheDocument();
  },
};

export const EmailNeedsAMailServer: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "A recurring entry is due by email" }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(canvas.getByText(/cannot send mail yet/u)).toBeInTheDocument();
  },
};

export const EmailChosen: Story = {
  parameters: withHandlers(emailEnabledHandler, getMeMockHandler(emailSubscriber)),
  play: async ({ canvas }) => {
    const billByEmail = await canvas.findByRole("checkbox", {
      name: "A recurring entry is due by email",
    });
    await waitFor(() => expect(billByEmail).not.toHaveAttribute("aria-disabled"));
    await expect(billByEmail).toBeChecked();
    await expect(
      canvas.getByRole("checkbox", { name: "A budget reaches 80% by email" }),
    ).not.toBeChecked();
  },
};

export const EmailNeedsAConfirmedAddress: Story = {
  parameters: withHandlers(emailEnabledHandler, getMeMockHandler(unverifiedUser)),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByText(/until you confirm your address/u)).toBeInTheDocument(),
    );
  },
};

export const SavingEmailChoices: Story = {
  parameters: withHandlers(emailEnabledHandler),
  play: async ({ canvas }) => {
    const budget = await canvas.findByRole("checkbox", { name: "A budget reaches 80% by email" });
    await waitFor(() => expect(budget).not.toHaveAttribute("aria-disabled"));
    await userEvent.click(budget);
    await expect(budget).toBeChecked();
    const save = canvas.getByRole("button", { name: "Save" });
    await userEvent.click(save);
    await waitFor(() => expect(save).not.toHaveAttribute("aria-busy"));
  },
};

export const NotConnected: Story = {
  parameters: withHandlers(getMyDiscordMockHandler(myDiscordEmpty)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "A recurring entry is due on Discord" }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(canvas.getByText(/Connect a Discord channel below/u)).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: /Send a test message/u })).toBeNull();
  },
};

export const SavingAWebhook: Story = {
  parameters: withHandlers(getMyDiscordMockHandler(myDiscordEmpty)),
  play: async ({ canvas }) => {
    const url = await canvas.findByLabelText("Webhook URL");
    await fireEvent.change(url, { target: { value: "https://example.com/hook" } });
    await expect(
      await canvas.findByText(/starts with https:\/\/discord\.com\/api\/webhooks/u),
    ).toBeInTheDocument();
    await fireEvent.change(url, { target: { value: webhook } });
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(url).toHaveValue(""));
  },
};

export const TestSent: Story = {
  play: async ({ canvas }) => {
    const test = await canvas.findByRole("button", { name: /Send a test message/u });
    await userEvent.click(test);
    await waitFor(() => expect(test).toBeEnabled());
  },
};

export const TestRefused: Story = {
  parameters: withHandlers(getTestMyDiscordMockHandler(failWith(discordWebhookGoneProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Send a test message/u }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/no longer exists/u);
  },
};

export const Removing: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Remove webhook/u }));
    const dialog = await openedDialog("alertdialog");
    await expect(dialog).toHaveTextContent(/Messages still waiting to be sent are dropped/u);
  },
};

export const DisabledByDiscord: Story = {
  parameters: withHandlers(getMyDiscordMockHandler(myDiscordGone)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/no longer exists/u);
  },
};

export const Unreadable: Story = {
  parameters: withHandlers(getMyDiscordMockHandler(myDiscordUnreadable)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/can no longer be read/u);
  },
};

export const LastDeliveryFailed: Story = {
  parameters: withHandlers(getMyDiscordMockHandler(myDiscordFailing)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/Last problem: Discord answered 503/u),
    ).toBeInTheDocument();
  },
};

export const DiscordNotAllowed: Story = {
  parameters: withHandlers(discordOffHandler),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByText(/has not allowed it on this installation/u)).toBeInTheDocument(),
    );
    await expect(canvas.getByLabelText("Webhook URL")).toBeDisabled();
    await expect(canvas.getByRole("button", { name: /Send a test message/u })).toBeDisabled();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getMyDiscordMockHandler(pending)),
};
