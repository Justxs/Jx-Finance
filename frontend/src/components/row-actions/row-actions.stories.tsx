import type { Meta, StoryObj } from "@storybook/react-vite";
import { Copy } from "lucide-react";
import { fn } from "storybook/test";
import { Button } from "@/components/ui/button/button";
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

export const WithExtraAction: Story = {
  args: {
    children: (
      <Button variant="ghost" size="icon-sm" aria-label="Duplicate: Groceries">
        <Copy />
      </Button>
    ),
  },
};
