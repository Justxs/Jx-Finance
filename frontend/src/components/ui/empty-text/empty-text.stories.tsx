import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { EmptyText } from "./empty-text";

const meta = {
  title: "UI/EmptyText",
  component: EmptyText,
  args: { children: "No goals yet." },
} satisfies Meta<typeof EmptyText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No goals yet.")).toBeVisible();
  },
};

export const Filtered: Story = {
  args: { filtered: true },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("No goals yet.")).toBeNull();
    await expect(canvas.getByText("No rows match these filters.")).toBeVisible();
  },
};
