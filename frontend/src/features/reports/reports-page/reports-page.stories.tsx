import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { presetRange } from "../report-filters";
import { ReportsPage } from "./reports-page";

function routeFor(range: { dateFrom: string; dateTo: string }) {
  return `/reports?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}`;
}

const meta = {
  title: "Features/Reports/ReportsPage",
  component: ReportsPage,
  parameters: { layout: "fullscreen", route: "/reports" },
  render: () => (
    <div className="p-6">
      <QueryBoundary fallback={<Skeleton className="h-[40rem] w-full" />}>
        <ReportsPage />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof ReportsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThisMonth: Story = {};

export const LastMonth: Story = { parameters: { route: routeFor(presetRange("lastMonth")) } };

export const ThisYearWithMonthBuckets: Story = {
  parameters: { route: routeFor(presetRange("thisYear")) },
};

export const LastYear: Story = { parameters: { route: routeFor(presetRange("lastYear")) } };

export const CustomRange: Story = {
  parameters: { route: routeFor({ dateFrom: "2026-08-10", dateTo: "2026-09-12" }) },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const EmptyYearWithoutNetWorthHistory: Story = {
  parameters: { route: routeFor(presetRange("thisYear")), msw: { handlers: emptyHandlers } },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
