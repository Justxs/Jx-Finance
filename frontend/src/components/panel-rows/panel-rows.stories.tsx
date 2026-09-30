import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { ProgressRowsSkeleton } from "@/components/progress-row/progress-row";
import { withWidth } from "@/storybook/decorators";
import { PanelRows, PanelRowsSkeleton } from "./panel-rows";

const meta = {
  title: "Components/PanelRows",
  component: PanelRows,
  decorators: [withWidth("column")],
  args: {
    count: 2,
    emptyText: "No budgets yet.",
    children: (
      <>
        <li className="py-3">Groceries</li>
        <li className="py-3">Transport</li>
      </>
    ),
  },
} satisfies Meta<typeof PanelRows>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("listitem")).toHaveLength(2);
  },
};

export const Empty: Story = {
  args: { count: 0 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No budgets yet.")).toBeVisible();
  },
};

export const Loading: Story = {
  render: () => (
    <PanelRowsSkeleton>
      <ProgressRowsSkeleton rows={3} />
    </PanelRowsSkeleton>
  ),
};
