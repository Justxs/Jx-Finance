import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
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

export const WithAction: Story = {
  args: { action: <button type="button">Add goal</button> },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Add goal" })).toBeVisible();
  },
};

export const FilteredWithClear: Story = {
  args: { filtered: true, action: <button type="button">Add goal</button>, onClearFilters: fn() },
  play: async ({ canvas, args }) => {
    await expect(canvas.queryByRole("button", { name: "Add goal" })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Clear filters" }));
    await expect(args.onClearFilters).toHaveBeenCalledOnce();
  },
};
