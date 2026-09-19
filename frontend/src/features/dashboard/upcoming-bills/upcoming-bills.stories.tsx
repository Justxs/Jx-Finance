import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryBoundary } from "@/components/query-boundary";
import { RowsSkeleton } from "@/components/ui/skeleton";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { UpcomingBills } from "./upcoming-bills";

const meta = {
  title: "Features/Dashboard/UpcomingBills",
  component: UpcomingBills,
  render: () => (
    <div className="w-[min(28rem,90vw)]">
      <QueryBoundary fallback={<RowsSkeleton rows={5} />}>
        <UpcomingBills />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof UpcomingBills>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
