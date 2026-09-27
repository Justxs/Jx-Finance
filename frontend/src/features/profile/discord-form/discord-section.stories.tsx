import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor } from "storybook/test";
import {
  getMyDiscordMockHandler,
  getTestMyDiscordMockHandler,
} from "@/api/generated/users/users.msw";
import {
  discordWebhookGoneProblem,
  myDiscordEmpty,
  myDiscordFailing,
  myDiscordGone,
  myDiscordUnreadable,
} from "@/storybook/fixtures";
import { discordOffHandler, failWith, pending, withHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { DiscordSection } from "./discord-section";

const meta = {
  title: "Features/Profile/DiscordSection",
  component: DiscordSection,
  parameters: { layout: "padded", route: "/profile" },
} satisfies Meta<typeof DiscordSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const webhook = "https://discord.com/api/webhooks/123456789012345678/abc-DEF_123";

export const Configured: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Webhook URL")).toHaveValue("");
    await expect(canvas.getByRole("checkbox", { name: "A recurring entry is due" })).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: "A budget reaches 80%" })).not.toBeChecked();
    await expect(canvas.getByText(/Last message delivered/u)).toBeInTheDocument();
  },
};

export const Empty: Story = {
  parameters: withHandlers(getMyDiscordMockHandler(myDiscordEmpty)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("button", { name: /Send a test message/u }),
    ).toBeDisabled();
    await expect(canvas.queryByRole("button", { name: /Remove webhook/u })).not.toBeInTheDocument();
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

export const InstallationOff: Story = {
  parameters: withHandlers(discordOffHandler),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(/has not allowed Discord/u);
    await expect(canvas.getByLabelText("Webhook URL")).toBeDisabled();
    await expect(canvas.getByRole("button", { name: /Send a test message/u })).toBeDisabled();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getMyDiscordMockHandler(pending)),
};
