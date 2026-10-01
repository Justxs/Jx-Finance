import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { getNetWorthMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { netWorth, netWorthWithOpenBalances, settingsWith } from "@/storybook/fixtures";
import { errorHandlers, withHandlers } from "@/storybook/handlers";
import { OpenBalancesToggle } from "./open-balances-toggle";

const meta = {
  title: "Features/NetWorth/OpenBalancesToggle",
  component: OpenBalancesToggle,
  parameters: { route: "/net-worth" },
} satisfies Meta<typeof OpenBalancesToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Counted: Story = {
  parameters: withHandlers(getNetWorthMockHandler(netWorthWithOpenBalances)),
  play: async ({ canvas }) => {
    const toggle = await canvas.findByRole("button", { name: "Open balances" });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
  },
};

export const TurnsOn: Story = {
  parameters: withHandlers(getNetWorthMockHandler(netWorth)),
  play: async ({ canvas }) => {
    const toggle = await canvas.findByRole("button", { name: "Open balances" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeEnabled());
  },
};

export const WithoutHouseholds: Story = {
  parameters: withHandlers(
    getSettingsMockHandler(settingsWith({ features: { households: false } })),
  ),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.queryByRole("button", { name: "Open balances" })).toBeNull());
  },
};

export const LoadError: Story = { parameters: { msw: { handlers: errorHandlers } } };
