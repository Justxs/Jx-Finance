import type { Meta, StoryObj } from "@storybook/react-vite";
import { Copy } from "lucide-react";
import { expect, fn } from "storybook/test";
import { chooseMenuItem } from "@/storybook/interactions";
import { RowActions } from "./row-actions";

const meta = {
  title: "Components/RowActions",
  component: RowActions,
  args: {
    label: "Groceries",
    onEdit: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof RowActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DeleteOnly: Story = { args: { onEdit: undefined } };

export const Deleting: Story = { args: { deletePending: true, deleteDisabled: true } };

export const Archive: Story = { args: { removeKind: "archive" } };

export const Large: Story = { args: { size: "icon" } };

export const Collapsed: Story = {
  args: {
    actions: [{ icon: Copy, label: "Duplicate", onSelect: fn() }],
  },
  play: async ({ args, canvas }) => {
    await chooseMenuItem(canvas.getByRole("button", { name: "Actions: Groceries" }), "Edit");
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await expect(canvas.queryByRole("button", { name: "Edit: Groceries" })).toBeNull();
  },
};

export const CollapsedDeleting: Story = {
  args: {
    ...Collapsed.args,
    deletePending: true,
    deleteDisabled: true,
  },
};
