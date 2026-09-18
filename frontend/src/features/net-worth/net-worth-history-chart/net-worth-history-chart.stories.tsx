import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { netWorthHistoryItems } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { NetWorthHistoryChart } from "./net-worth-history-chart";

function NetWorthHistoryChartStory() {
  return (
    <section className="card w-[min(48rem,calc(100vw-3rem))] p-6">
      <h2 className="mb-4 font-semibold">Net worth trend</h2>
      <QueryBoundary fallback={<Skeleton className="h-56 w-full" />}>
        <NetWorthHistoryChart />
      </QueryBoundary>
    </section>
  );
}

function historyHandlers(items: typeof netWorthHistoryItems) {
  return [http.get("*/api/networth/history", () => HttpResponse.json({ items })), ...handlers];
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
  render: () => <NetWorthHistoryChartStory />,
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
