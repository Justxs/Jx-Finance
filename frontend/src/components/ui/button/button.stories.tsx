import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Save changes" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "secondary", "ghost", "destructive", "link"],
    },
    size: { control: "select", options: ["default", "xs", "sm", "lg", "icon", "icon-sm"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pending: Story = { args: { pending: true } };

export const Disabled: Story = { args: { disabled: true } };

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Delete">
        <Trash2 />
      </Button>
      <Button size="icon" pending aria-label="Delete">
        <Trash2 />
      </Button>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Button>
      <Plus />
      Add transaction
    </Button>
  ),
};
