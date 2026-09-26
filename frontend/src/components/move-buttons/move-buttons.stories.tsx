import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { MoveButtons } from "./move-buttons";

const meta = {
  title: "Components/MoveButtons",
  component: MoveButtons,
  args: { label: "Groceries", first: false, last: false, onMove: fn() },
} satisfies Meta<typeof MoveButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const First: Story = { args: { first: true } };

export const Last: Story = { args: { last: true } };

export const Disabled: Story = { args: { disabled: true } };
