import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "@/components/ui/card";
import { RowsSkeleton, Skeleton, StatsSkeleton } from "./skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  args: { className: "h-8 w-44" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Circle: Story = { args: { className: "size-10 rounded-full" } };

export const TextLines: Story = {
  render: () => (
    <div className="w-72 space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ),
};

export const CardPlaceholder: Story = {
  render: () => (
    <Card className="w-80 space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-32 w-full" />
    </Card>
  ),
};

export const LedgerRows: Story = {
  render: () => (
    <div className="w-[min(90vw,36rem)]">
      <RowsSkeleton rows={5} />
    </div>
  ),
};

export const SummaryFigures: Story = {
  render: () => (
    <div className="w-[min(90vw,56rem)]">
      <StatsSkeleton />
    </div>
  ),
};
