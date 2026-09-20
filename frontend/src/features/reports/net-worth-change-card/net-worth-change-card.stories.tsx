import type { Meta, StoryObj } from "@storybook/react-vite";
import { getNetWorthHistoryMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { FIXTURE_MONTH_END, FIXTURE_YEAR_START, netWorthHistoryItems } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { NetWorthChangeCard } from "./net-worth-change-card";

const decliningHistory = {
  items: netWorthHistoryItems.map((item, index) => ({
    ...item,
    netWorth: (64000 - index * 1850.35).toFixed(2),
  })),
};

const hugeHistory = {
  items: [
    { ...netWorthHistoryItems[0]!, netWorth: "1250000.10" },
    { ...netWorthHistoryItems.at(-1)!, netWorth: "98765432.99" },
  ],
};

const meta = {
  title: "Features/Reports/NetWorthChangeCard",
  component: NetWorthChangeCard,
  parameters: { route: "/reports" },
  args: { dateFrom: FIXTURE_YEAR_START, dateTo: FIXTURE_MONTH_END },
  render: (args) => (
    <div className="w-[28rem] max-w-full">
      <QueryBoundary fallback={<Skeleton className="h-28 w-full" />}>
        <NetWorthChangeCard {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof NetWorthChangeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ShorterRange: Story = { args: { dateFrom: "2026-06-01", dateTo: "2026-09-30" } };

export const NegativeChange: Story = {
  parameters: {
    msw: {
      handlers: [getNetWorthHistoryMockHandler(decliningHistory), ...handlers],
    },
  },
};

export const LargeAmountsNarrow: Story = {
  parameters: {
    msw: {
      handlers: [getNetWorthHistoryMockHandler(hugeHistory), ...handlers],
    },
  },
  render: (args) => (
    <div className="w-64">
      <QueryBoundary fallback={<Skeleton className="h-28 w-full" />}>
        <NetWorthChangeCard {...args} />
      </QueryBoundary>
    </div>
  ),
};

export const SingleSnapshotInRange: Story = {
  args: { dateFrom: "2026-09-01", dateTo: "2026-09-30" },
};

export const NoHistory: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
