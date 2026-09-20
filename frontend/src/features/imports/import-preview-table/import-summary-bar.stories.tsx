import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { withWidth } from "@/storybook/decorators";
import { categories, importPreviewRows } from "@/storybook/fixtures";
import { ImportSummaryBar } from "./import-summary-bar";
import { toPreviewRows } from "./preview-rows";

const rows = toPreviewRows(importPreviewRows, [], categories);

const meta = {
  title: "Features/Imports/ImportSummaryBar",
  component: ImportSummaryBar,
  parameters: { layout: "fullscreen" },
  args: {
    rows,
    categories,
    onApplyCategory: (category) => toast.message(`Apply ${category.name}`),
  },
  decorators: [withWidth("p-6 lg:p-10")],
} satisfies Meta<typeof ImportSummaryBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NothingSelected: Story = {
  args: { rows: rows.map((row) => ({ ...row, selected: false })) },
};

export const EverythingSelected: Story = {
  args: { rows: rows.map((row) => ({ ...row, selected: true })) },
};

export const PositiveNet: Story = {
  args: { rows: rows.map((row) => ({ ...row, selected: row.type === "income" })) },
};

export const NoCategories: Story = { args: { categories: [] } };

export const Disabled: Story = { args: { disabled: true } };
