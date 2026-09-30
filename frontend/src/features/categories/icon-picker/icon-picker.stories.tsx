import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { Label } from "@/components/ui/label/label";
import { withWidth } from "@/storybook/decorators";
import { IconPicker } from "./icon-picker";

const LABEL_ID = "icon-picker-label";

function ControlledIconPicker({ initial }: Readonly<{ initial: string | null }>) {
  const [value, setValue] = useState<string | null>(initial);

  return <IconPicker aria-labelledby={LABEL_ID} value={value} onChange={setValue} />;
}

const meta = {
  title: "Features/Categories/IconPicker",
  component: IconPicker,
  args: { value: null, onChange: fn(), "aria-labelledby": LABEL_ID },
  decorators: [
    withWidth("column"),
    function withLabel(Story) {
      return (
        <div className="space-y-1.5">
          <Label id={LABEL_ID}>Icon</Label>
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof IconPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radiogroup", { name: "Icon" })).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "No icon" })).toBeChecked();
  },
};

export const Selected: Story = {
  args: { value: "shopping-bag" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Selected: Shopping bag")).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "Shopping bag" })).toBeChecked();
  },
};

export const UnknownValue: Story = { args: { value: "not-a-real-icon" } };

export const Interactive: Story = {
  render: () => <ControlledIconPicker initial="coffee" />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Coffee" }));
    await expect(canvas.getByText("Selected: Coffee")).toBeVisible();

    await userEvent.click(canvas.getByRole("radio", { name: "No icon" }));
    await expect(canvas.getByText("No icon selected")).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "No icon" })).toBeChecked();
  },
};

export const ChoosesWithArrowKeys: Story = {
  render: () => <ControlledIconPicker initial={null} />,
  play: async ({ canvas }) => {
    const radios = canvas.getAllByRole("radio");
    await expect(radios.filter((radio) => radio.tabIndex === 0)).toHaveLength(1);

    await userEvent.tab();
    await expect(canvas.getByRole("radio", { name: "No icon" })).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");
    await expect(radios[1]).toHaveFocus();
    await expect(radios[1]).toBeChecked();
    await expect(canvas.queryByText("No icon selected")).toBeNull();
  },
};

export const NarrowContainer: Story = {
  decorators: [withWidth("w-40")],
};
