import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeToggle } from "./theme-toggle";

const meta = {
  title: "Components/ThemeToggle",
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InToolbar: Story = {
  render: () => (
    <div className="flex items-center gap-2 rounded-md border bg-card p-2">
      <span className="px-2 text-sm text-muted-foreground">Appearance</span>
      <ThemeToggle />
    </div>
  ),
};
