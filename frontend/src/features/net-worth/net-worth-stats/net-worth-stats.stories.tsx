import type { Meta, StoryObj } from "@storybook/react-vite";
import type { NetWorthResponse } from "@/api/generated/model";
import { getNetWorthMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { NetWorthStats } from "./net-worth-stats";

function NetWorthStatsStory() {
  return (
    <div className="w-[min(64rem,calc(100vw-5rem))]">
      <QueryBoundary fallback={<Skeleton className="h-28 w-full" />}>
        <NetWorthStats />
      </QueryBoundary>
    </div>
  );
}

function netWorthHandlers(body: NetWorthResponse) {
  return [getNetWorthMockHandler(body), ...handlers];
}

const meta = {
  title: "Features/NetWorth/NetWorthStats",
  component: NetWorthStats,
  parameters: { route: "/net-worth" },
  render: () => <NetWorthStatsStory />,
} satisfies Meta<typeof NetWorthStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllZero: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const NegativeNetWorth: Story = {
  parameters: {
    msw: {
      handlers: netWorthHandlers({
        accounts: "1240.10",
        assets: "0.00",
        debts: "18450.32",
        netWorth: "-17210.22",
      }),
    },
  },
};

export const VeryLargeValues: Story = {
  parameters: {
    msw: {
      handlers: netWorthHandlers({
        accounts: "12345678.90",
        assets: "987654321.12",
        debts: "123456789.01",
        netWorth: "876543211.01",
      }),
    },
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
