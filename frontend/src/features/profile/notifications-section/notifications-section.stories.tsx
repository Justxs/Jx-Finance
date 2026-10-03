import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import { getHouseholdsMockHandler } from "@/api/generated/households/households.msw";
import { getPublicSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import {
  digestSubscriber,
  emailSubscriber,
  householdDigestSubscriber,
  currentUser,
  publicSettings,
  unverifiedUser,
} from "@/storybook/fixtures";
import {
  discordOffHandler,
  emailEnabledHandler,
  pending,
  telegramEnabledHandler,
  withHandlers,
} from "@/storybook/handlers";
import { NotificationsSection } from "./notifications-section";

const meta = {
  title: "Features/Profile/NotificationsSection",
  component: NotificationsSection,
  parameters: { layout: "padded", route: "/profile" },
} satisfies Meta<typeof NotificationsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DiscordChosen: Story = {
  parameters: withHandlers(
    getMeMockHandler({ ...currentUser, discordNotificationTypes: ["billDue", "budgetExceeded"] }),
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "A recurring entry is due on Discord" }),
    ).toBeChecked();
    await expect(
      canvas.getByRole("checkbox", { name: "A budget reaches 80% on Discord" }),
    ).not.toBeChecked();
  },
};

export const EmailNotSetUp: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Monthly digest on Discord" }),
    ).not.toHaveAttribute("aria-disabled");
    await expect(canvas.queryByRole("columnheader", { name: "Email" })).toBeNull();
    await expect(canvas.queryByRole("checkbox", { name: "Monthly digest by email" })).toBeNull();
  },
};

export const DiscordNotSetUp: Story = {
  parameters: withHandlers(
    getPublicSettingsMockHandler({ ...publicSettings, emailEnabled: true, discordEnabled: false }),
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "A recurring entry is due by email" }),
    ).toBeVisible();
    await waitFor(() => expect(canvas.queryByRole("columnheader", { name: "Discord" })).toBeNull());
  },
};

export const NothingSetUp: Story = {
  parameters: withHandlers(discordOffHandler),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/can set up email, Discord or Telegram/u),
    ).toBeInTheDocument();
    await expect(canvas.queryByRole("columnheader", { name: "Discord" })).toBeNull();
    await expect(canvas.queryByText("Monthly digest")).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Save" })).toBeNull();
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

export const DigestChosen: Story = {
  parameters: withHandlers(emailEnabledHandler, getMeMockHandler(digestSubscriber)),
  play: async ({ canvas }) => {
    const digestByEmail = await canvas.findByRole("checkbox", { name: "Monthly digest by email" });
    await waitFor(() => expect(digestByEmail).not.toHaveAttribute("aria-disabled"));
    await expect(digestByEmail).toBeChecked();
    await expect(
      canvas.getByRole("img", { name: "Only sent by email, Discord or Telegram" }),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/sums up the month that ended/u)).toBeInTheDocument();
  },
};

export const DigestPerHousehold: Story = {
  parameters: withHandlers(emailEnabledHandler, getMeMockHandler(householdDigestSubscriber)),
  play: async ({ canvas }) => {
    const everything = await canvas.findByRole("checkbox", { name: "Everything" });
    await expect(everything).not.toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: "Kazlauskų šeima" })).toBeChecked();
    await userEvent.click(everything);
    await expect(everything).toBeChecked();
    const save = canvas.getByRole("button", { name: "Save" });
    await userEvent.click(save);
    await waitFor(() => expect(save).not.toHaveAttribute("aria-busy"));
  },
};

export const DigestWithoutHouseholds: Story = {
  parameters: withHandlers(getHouseholdsMockHandler([])),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Monthly digest on Discord" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("group", { name: "Monthly digest for" })).toBeNull();
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

export const SavingDiscordChoices: Story = {
  play: async ({ canvas }) => {
    const budget = await canvas.findByRole("checkbox", { name: "A budget reaches 80% on Discord" });
    await userEvent.click(budget);
    await expect(budget).toBeChecked();
    const save = canvas.getByRole("button", { name: "Save" });
    await userEvent.click(save);
    await waitFor(() => expect(save).not.toHaveAttribute("aria-busy"));
  },
};

export const EveryChannel: Story = {
  parameters: withHandlers(
    getPublicSettingsMockHandler({
      ...publicSettings,
      emailEnabled: true,
      discordEnabled: true,
      telegramEnabled: true,
    }),
    getMeMockHandler({ ...currentUser, telegramNotificationTypes: ["lowBalance"] }),
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("columnheader", { name: "Telegram" })).toBeVisible();
    await expect(canvas.getByRole("columnheader", { name: "Discord" })).toBeVisible();
    await expect(canvas.getByRole("columnheader", { name: "Email" })).toBeVisible();
    await expect(
      canvas.getByRole("checkbox", { name: "An account is forecast to go below zero on Telegram" }),
    ).toBeChecked();
  },
};

export const SavingTelegramChoices: Story = {
  parameters: withHandlers(telegramEnabledHandler),
  play: async ({ canvas }) => {
    const budget = await canvas.findByRole("checkbox", {
      name: "A budget reaches 80% on Telegram",
    });
    await userEvent.click(budget);
    await expect(budget).toBeChecked();
    const save = canvas.getByRole("button", { name: "Save" });
    await userEvent.click(save);
    await waitFor(() => expect(save).not.toHaveAttribute("aria-busy"));
  },
};

export const Loading: Story = {
  parameters: withHandlers(getMeMockHandler(pending)),
};
