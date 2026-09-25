import type { Meta, StoryObj } from "@storybook/react-vite";
import { getCategoryBreakdownMockHandler } from "@/api/generated/dashboard/dashboard.msw";
import { Card } from "@/components/ui/card/card";
import { withWidth } from "@/storybook/decorators";
import { categoryBreakdown } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { CategoryBreakdownChart } from "./category-breakdown-chart";

const meta = {
  title: "Features/Dashboard/CategoryBreakdownChart",
  component: CategoryBreakdownChart,
  decorators: [
    (Story) => (
      <Card className="p-6">
        <Story />
      </Card>
    ),
    withWidth("dialog"),
  ],
} satisfies Meta<typeof CategoryBreakdownChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

function singleCategoryBreakdown() {
  return { ...categoryBreakdown, items: categoryBreakdown.items.slice(0, 1) };
}

export const SingleCategory: Story = {
  parameters: withHandlers(getCategoryBreakdownMockHandler(singleCategoryBreakdown)),
};
