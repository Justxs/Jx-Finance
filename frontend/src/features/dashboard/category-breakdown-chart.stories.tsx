import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryBreakdownItems } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { CategoryBreakdownChart } from "./category-breakdown-chart";

const meta = {
  title: "Features/Dashboard/CategoryBreakdownChart",
  component: CategoryBreakdownChart,
  render: () => (
    <div className="card w-[min(36rem,90vw)] p-6">
      <QueryBoundary fallback={<Skeleton className="h-64 w-full" />}>
        <CategoryBreakdownChart />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof CategoryBreakdownChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

function singleCategoryBreakdown() {
  return HttpResponse.json({ items: categoryBreakdownItems.slice(0, 1) });
}

export const SingleCategory: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/dashboard/category-breakdown", singleCategoryBreakdown),
        ...handlers,
      ],
    },
  },
};
