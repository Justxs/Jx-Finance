import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "@/components/ui/card/card";
import { RowsSkeleton, SectionSkeleton, Skeleton, TextSkeleton } from "./skeleton";

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
    <div className="w-72">
      <TextSkeleton size="title" width="w-2/3" />
      <TextSkeleton size="sm" width="w-full" />
      <TextSkeleton size="xs" width="w-1/2" />
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

export const TwoLineRows: Story = {
  render: () => (
    <div className="w-[min(90vw,36rem)]">
      <RowsSkeleton rows={4} lines={2} />
    </div>
  ),
};

export const TitledSection: Story = {
  render: () => (
    <div className="w-[min(90vw,40rem)]">
      <SectionSkeleton rows={3} description />
    </div>
  ),
};
