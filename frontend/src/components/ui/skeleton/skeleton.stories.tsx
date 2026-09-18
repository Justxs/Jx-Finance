import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./skeleton";

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
    <div className="card w-80 space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  ),
};

export const TableRows: Story = {
  render: () => (
    <div className="card w-[min(90vw,36rem)] divide-y divide-border">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-6 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  ),
};
