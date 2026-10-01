import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { expect, fn } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { categories, importPreviewRows, transactionGroups } from "@/storybook/fixtures";
import { chooseOption } from "@/storybook/interactions";
import { ImportSummaryBar, NO_GROUP } from "./import-summary-bar";
import { toPreviewRows } from "./preview-rows";

const rows = toPreviewRows(importPreviewRows, [], categories);

const meta = {
  title: "Features/Imports/ImportSummaryBar",
  component: ImportSummaryBar,
  parameters: { layout: "fullscreen" },
  args: {
    rows,
    categories,
    groups: transactionGroups,
    group: NO_GROUP,
    onApplyCategory: (category) => toast.message(`Apply ${category.name}`),
    onGroupChange: fn(),
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

export const ChoosingANewGroup: Story = {
  play: async ({ canvas, args }) => {
    await chooseOption(
      canvas.getByRole("combobox", { name: "Put the selected rows in a group" }),
      "New group",
    );
    await expect(args.onGroupChange).toHaveBeenCalledWith({ groupId: "new", name: "" });
  },
};

export const NamingANewGroup: Story = {
  args: { group: { groupId: "new", name: "Kelionė į Rygą" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Group name" })).toHaveValue("Kelionė į Rygą");
  },
};

export const NoGroupsYet: Story = { args: { groups: [] } };
