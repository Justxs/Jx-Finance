import type { Meta, StoryObj } from "@storybook/react-vite";
import { getNetWorthHistoryMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { withWidth } from "@/storybook/decorators";
import { FIXTURE_MONTH_END, FIXTURE_YEAR_START, netWorthHistoryItems } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
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
  decorators: [withWidth("column")],
} satisfies Meta<typeof NetWorthChangeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ShorterRange: Story = { args: { dateFrom: "2026-06-01", dateTo: "2026-09-30" } };

export const NegativeChange: Story = {
  parameters: withHandlers(getNetWorthHistoryMockHandler(decliningHistory)),
};

export const LargeAmountsNarrow: Story = {
  parameters: withHandlers(getNetWorthHistoryMockHandler(hugeHistory)),
  decorators: [withWidth("narrow")],
};

export const SingleSnapshotInRange: Story = {
  args: { dateFrom: "2026-09-01", dateTo: "2026-09-30" },
};

export const NoHistory: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
