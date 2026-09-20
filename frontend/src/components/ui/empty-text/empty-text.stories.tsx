import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyText } from "./empty-text";

const meta = {
  title: "UI/EmptyText",
  component: EmptyText,
  args: { children: "No goals yet." },
} satisfies Meta<typeof EmptyText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filtered: Story = { args: { filtered: true } };
