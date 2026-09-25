import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { ThemeToggle } from "./theme-toggle";

const meta = {
  title: "Components/ThemeToggle",
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole("button", { name: "Toggle theme" });

    await userEvent.click(toggle);
    await expect(document.documentElement).toHaveClass("dark");

    await userEvent.click(toggle);
    await expect(document.documentElement).not.toHaveClass("dark");
  },
};

export const InToolbar: Story = {
  render: () => (
    <div className="flex items-center gap-2 rounded-md border bg-card p-2">
      <span className="px-2 text-sm text-muted-foreground">Appearance</span>
      <ThemeToggle />
    </div>
  ),
};
