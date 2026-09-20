import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "../button/button";
import { Tooltip, TooltipProvider } from "./tooltip";

const sides = ["top", "right", "bottom", "left"] as const;

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  parameters: { providers: "none" },
  args: { content: "Edit: Groceries", children: <Button variant="outline">Hover me</Button> },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = { args: { defaultOpen: true } };

export const Sides: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3">
      {sides.map((side) => (
        <Tooltip key={side} content={`Side: ${side}`} side={side}>
          <Button variant="outline">{side}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};

export const IconActions: Story = {
  render: () => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" aria-label="Edit" tooltip="Edit: Groceries">
        <Pencil />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Delete" tooltip="Delete: Groceries">
        <Trash2 />
      </Button>
    </div>
  ),
};

export const LongContent: Story = {
  args: {
    content: "Split transactions cannot be selected for bulk actions. Edit the lines instead.",
    defaultOpen: true,
  },
};
