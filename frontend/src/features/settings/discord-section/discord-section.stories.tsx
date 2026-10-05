import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor } from "storybook/test";
import {
  getDiscordSettingsMockHandler,
  getSendTestDiscordMockHandler,
  getUpdateDiscordSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  discordSettingsEmpty,
  discordSettingsFailing,
  discordSettingsGone,
  discordSettingsUnreadable,
  discordWebhookGoneProblem,
  serverErrorProblem,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { DiscordSection } from "./discord-section";

const meta = {
  title: "Features/Settings/DiscordSection",
  component: DiscordSection,
  parameters: { layout: "padded", route: "/settings" },
} satisfies Meta<typeof DiscordSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const webhook = "https://discord.com/api/webhooks/123456789012345678/abc-DEF_123";

export const Configured: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Send notifications to Discord" }),
    ).toBeChecked();
    await expect(canvas.getByLabelText("Webhook URL")).toHaveValue("");
    await expect(canvas.getByText(/Last message delivered/u)).toBeInTheDocument();
  },
};

export const NotSetUp: Story = {
  parameters: withHandlers(getDiscordSettingsMockHandler(discordSettingsEmpty)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Send notifications to Discord" }),
    ).not.toBeChecked();
    await expect(canvas.getByRole("button", { name: /Send a test message/u })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};

export const SwitchingOnNeedsAWebhook: Story = {
  parameters: withHandlers(getDiscordSettingsMockHandler(discordSettingsEmpty)),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: "Send notifications to Discord" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("This field is required.")).toBeInTheDocument();
  },
};

export const SavingAWebhook: Story = {
  parameters: withHandlers(getDiscordSettingsMockHandler(discordSettingsEmpty)),
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
  parameters: withHandlers(getSendTestDiscordMockHandler(failWith(discordWebhookGoneProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Send a test message/u }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/no longer exists/u);
  },
};

export const DisabledByDiscord: Story = {
  parameters: withHandlers(getDiscordSettingsMockHandler(discordSettingsGone)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/no longer exists/u);
  },
};

export const Unreadable: Story = {
  parameters: withHandlers(getDiscordSettingsMockHandler(discordSettingsUnreadable)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/can no longer be read/u);
  },
};

export const LastDeliveryFailed: Story = {
  parameters: withHandlers(getDiscordSettingsMockHandler(discordSettingsFailing)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/Last problem: Discord answered 503/u),
    ).toBeInTheDocument();
  },
};

export const SaveFails: Story = {
  parameters: withHandlers(getUpdateDiscordSettingsMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: "Send notifications to Discord" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getDiscordSettingsMockHandler(pending)),
};
