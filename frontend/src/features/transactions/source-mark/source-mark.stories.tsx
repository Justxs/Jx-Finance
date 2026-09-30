import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { SourceMark } from "./source-mark";

const meta = {
  title: "Features/Transactions/SourceMark",
  component: SourceMark,
  parameters: { layout: "padded" },
  args: { transaction: { source: "api" } },
} satisfies Meta<typeof SourceMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AddedThroughTheApi: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Added through the API")).toBeVisible();
  },
};

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Pridėta per API")).toBeVisible();
  },
};

export const HandEntered: Story = {
  args: { transaction: { source: "manual" } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("Added through the API")).toBeNull();
  },
};

export const Imported: Story = {
  args: { transaction: { source: "imported" } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("Added through the API")).toBeNull();
  },
};
