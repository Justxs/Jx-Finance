import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { SegmentedControl } from "./segmented-control";

const flowOptions = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
] as const;

function FlowExample({ disabled = false }: Readonly<{ disabled?: boolean }>) {
  const [value, setValue] = useState<"expense" | "income">("expense");
  return (
    <SegmentedControl
      aria-label="Type"
      value={value}
      onChange={setValue}
      options={flowOptions}
      disabled={disabled}
    />
  );
}

const meta = {
  title: "UI/SegmentedControl",
  component: FlowExample,
} satisfies Meta<typeof FlowExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };

export const Choosing: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Income" }));
    await expect(canvas.getByRole("radio", { name: "Income" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Expense" })).not.toBeChecked();
  },
};
