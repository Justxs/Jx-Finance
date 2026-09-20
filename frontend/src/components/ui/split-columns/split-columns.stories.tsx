import type { Meta, StoryObj } from "@storybook/react-vite";
import { SplitColumns } from "./split-columns";

const meta = {
  title: "UI/SplitColumns",
  component: SplitColumns,
} satisfies Meta<typeof SplitColumns>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SplitColumns className="w-[min(90vw,64rem)] gap-y-4">
      <p className="border-t-2 border-rule pt-2 text-sm">Five parts</p>
      <p className="border-t-2 border-rule pt-2 text-sm">Seven parts</p>
    </SplitColumns>
  ),
};
