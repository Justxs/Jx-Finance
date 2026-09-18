import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { IconPicker } from "./icon-picker";

function ControlledIconPicker({ initial }: Readonly<{ initial: string | null }>) {
  const [value, setValue] = useState<string | null>(initial);

  return (
    <div className="space-y-3">
      <IconPicker value={value} onChange={setValue} />
      <p className="text-sm text-muted-foreground">Selected: {value ?? "none"}</p>
    </div>
  );
}

const meta = {
  title: "Features/Categories/IconPicker",
  component: IconPicker,
  args: { value: null, onChange: fn() },
  decorators: [
    function withPickerWidth(Story) {
      return (
        <div className="w-[min(28rem,calc(100vw-3rem))]">
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof IconPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { value: "utensils" } };

export const UnknownValue: Story = { args: { value: "not-a-real-icon" } };

export const Interactive: Story = { render: () => <ControlledIconPicker initial="coffee" /> };

export const NarrowContainer: Story = {
  decorators: [
    function withNarrowWidth(Story) {
      return (
        <div className="w-40">
          <Story />
        </div>
      );
    },
  ],
};
