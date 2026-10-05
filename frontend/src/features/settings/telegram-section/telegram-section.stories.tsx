import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor } from "storybook/test";
import {
  getSendTestTelegramMockHandler,
  getTelegramSettingsMockHandler,
  getUpdateTelegramSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  serverErrorProblem,
  telegramBotRemovedProblem,
  telegramSettingsEmpty,
  telegramSettingsFailing,
  telegramSettingsRemoved,
  telegramSettingsUnreadable,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { TelegramSection } from "./telegram-section";

const meta = {
  title: "Features/Settings/TelegramSection",
  component: TelegramSection,
  parameters: { layout: "padded", route: "/settings" },
} satisfies Meta<typeof TelegramSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const token = "123456789:AAEhBP0av18z2kPqhh1EbM3Xyh9ZNeC9Q1k";

export const Configured: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Send notifications to Telegram" }),
    ).toBeChecked();
    await expect(canvas.getByLabelText("Bot token")).toHaveValue("");
    await expect(canvas.getByLabelText("Group chat id")).toHaveValue("-1001234567890");
    await expect(canvas.getByText(/Last message delivered/u)).toBeInTheDocument();
  },
};

export const NotSetUp: Story = {
  parameters: withHandlers(getTelegramSettingsMockHandler(telegramSettingsEmpty)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Send notifications to Telegram" }),
    ).not.toBeChecked();
    await expect(canvas.getByRole("button", { name: /Send a test message/u })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};

export const SwitchingOnNeedsATokenAndAGroup: Story = {
  parameters: withHandlers(getTelegramSettingsMockHandler(telegramSettingsEmpty)),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: "Send notifications to Telegram" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findAllByText("This field is required.")).toHaveLength(2);
  },
};

export const SavingABot: Story = {
  parameters: withHandlers(getTelegramSettingsMockHandler(telegramSettingsEmpty)),
  play: async ({ canvas }) => {
    const field = await canvas.findByLabelText("Bot token");
    await fireEvent.change(field, { target: { value: "not-a-token" } });
    await expect(await canvas.findByText(/looks like 123456789:AAE/u)).toBeInTheDocument();
    await fireEvent.change(field, { target: { value: token } });
    await fireEvent.change(canvas.getByLabelText("Group chat id"), {
      target: { value: "-1001234567890" },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(field).toHaveValue(""));
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
  parameters: withHandlers(getSendTestTelegramMockHandler(failWith(telegramBotRemovedProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Send a test message/u }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/removed from the group/u);
  },
};

export const RemovedFromTheGroup: Story = {
  parameters: withHandlers(getTelegramSettingsMockHandler(telegramSettingsRemoved)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/removed from the group/u);
  },
};

export const Unreadable: Story = {
  parameters: withHandlers(getTelegramSettingsMockHandler(telegramSettingsUnreadable)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/can no longer be read/u);
  },
};

export const LastDeliveryFailed: Story = {
  parameters: withHandlers(getTelegramSettingsMockHandler(telegramSettingsFailing)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/Last problem: Telegram answered 502/u),
    ).toBeInTheDocument();
  },
};

export const SaveFails: Story = {
  parameters: withHandlers(getUpdateTelegramSettingsMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: "Send notifications to Telegram" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getTelegramSettingsMockHandler(pending)),
};
