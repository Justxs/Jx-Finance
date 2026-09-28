import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { IconPicker } from "./icon-picker";

function ControlledIconPicker({ initial }: Readonly<{ initial: string | null }>) {
  const [value, setValue] = useState<string | null>(initial);

  return <IconPicker value={value} onChange={setValue} />;
}

const meta = {
  title: "Features/Categories/IconPicker",
  component: IconPicker,
  args: { value: null, onChange: fn() },
  decorators: [withWidth("column")],
} satisfies Meta<typeof IconPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: { value: "shopping-bag" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Selected: Shopping bag")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Shopping bag" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

export const UnknownValue: Story = { args: { value: "not-a-real-icon" } };

export const Interactive: Story = {
  render: () => <ControlledIconPicker initial="coffee" />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Coffee" }));
    await expect(canvas.getByText("Selected: Coffee")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "No icon" }));
    await expect(canvas.getByText("No icon selected")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "No icon" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

export const NarrowContainer: Story = {
  decorators: [withWidth("w-40")],
};
