import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { getNetWorthHistoryMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { Section } from "@/components/ui/section/section";
import { withWidth } from "@/storybook/decorators";
import { netWorthHistoryItems } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { NetWorthHistoryChart } from "./net-worth-history-chart";

function historyHandlers(items: typeof netWorthHistoryItems) {
  return [getNetWorthHistoryMockHandler({ items }), ...handlers];
}

const negativeItems = netWorthHistoryItems.map((item, index) => ({
  ...item,
  netWorth: String(-25000 + index * 4200),
}));

const flatItems = netWorthHistoryItems.map((item) => ({ ...item, netWorth: "52000.00" }));

const longItems = Array.from({ length: 60 }, (_, index) => {
  const year = 2021 + Math.floor((index + 9) / 12);
  const month = ((index + 9) % 12) + 1;
  return {
    accounts: "0.00",
    assets: "0.00",
    debts: "0.00",
    date: `${year}-${String(month).padStart(2, "0")}-01`,
    netWorth: String(1_200_000 + index * 18_500 + (index % 5) * 22_000),
  };
});

const meta = {
  title: "Features/NetWorth/NetWorthHistoryChart",
  component: NetWorthHistoryChart,
  parameters: { route: "/net-worth" },
  decorators: [
    (Story) => (
      <Section>
        <h2 className="mb-4 font-semibold">Net worth trend</h2>
        <Story />
      </Section>
    ),
    withWidth("wide"),
  ],
} satisfies Meta<typeof NetWorthHistoryChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NotEnoughHistory: Story = {
  parameters: { msw: { handlers: historyHandlers(netWorthHistoryItems.slice(0, 1)) } },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const TwoPoints: Story = {
  parameters: { msw: { handlers: historyHandlers(netWorthHistoryItems.slice(0, 2)) } },
};

export const NegativeToPositive: Story = {
  parameters: { msw: { handlers: historyHandlers(negativeItems) } },
};

export const Flat: Story = { parameters: { msw: { handlers: historyHandlers(flatItems) } } };

export const FiveYearsLargeValues: Story = {
  parameters: { msw: { handlers: historyHandlers(longItems) } },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

const fallingItems = netWorthHistoryItems.map((item, index) => ({
  ...item,
  netWorth: String(90_000 - index * 1500),
}));

export const WithPace: Story = {
  args: { pace: true },
  play: async ({ canvas }) => {
    await canvas.findByText("At this pace");
  },
};

export const WithFallingPace: Story = {
  args: { pace: true },
  parameters: { msw: { handlers: historyHandlers(fallingItems) } },
};

export const PaceWithShortHistory: Story = {
  args: { pace: true },
  parameters: { msw: { handlers: historyHandlers(netWorthHistoryItems.slice(-3)) } },
  play: async ({ canvas }) => {
    await canvas.findByRole("img", { name: "Net worth over time" });
    await expect(canvas.queryByText("At this pace")).toBeNull();
  },
};
