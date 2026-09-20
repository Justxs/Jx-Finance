import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RowsSkeleton } from "@/components/ui/skeleton/skeleton";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { BudgetSnapshot } from "./budget-snapshot";

const meta = {
  title: "Features/Dashboard/BudgetSnapshot",
  component: BudgetSnapshot,
  render: () => (
    <div className="w-[min(28rem,90vw)]">
      <QueryBoundary fallback={<RowsSkeleton rows={5} />}>
        <BudgetSnapshot />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof BudgetSnapshot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
