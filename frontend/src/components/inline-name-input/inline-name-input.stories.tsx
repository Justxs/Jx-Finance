import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { InlineNameInput } from "./inline-name-input";

const meta = {
  title: "Components/InlineNameInput",
  component: InlineNameInput,
  args: {
    label: "Save filter",
    submitLabel: "Save filter",
    placeholder: "e.g. Groceries this month",
    maxLength: 60,
    className: "gap-2",
    onSubmit: fn(),
  },
  decorators: [withWidth("w-72")],
} satisfies Meta<typeof InlineNameInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };

export const Renaming: Story = {
  args: {
    label: "Name",
    submitLabel: "Save",
    submitIcon: <Check />,
    cancelLabel: "Cancel",
    defaultValue: "Renovation",
    className: "gap-1",
    onCancel: fn(),
  },
};

export const SubmitsOnEnter: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole("textbox", { name: "Save filter" });

    await userEvent.type(field, "September{Enter}");

    await expect(args.onSubmit).toHaveBeenCalledWith("September");
    await expect(field).toHaveValue("");
  },
};

export const IgnoresBlankName: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByRole("textbox", { name: "Save filter" }), "   {Enter}");

    await expect(args.onSubmit).not.toHaveBeenCalled();
    await expect(canvas.getByRole("button", { name: "Save filter" })).toBeDisabled();
  },
};

export const Cancelling: Story = {
  args: { ...Renaming.args },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));

    await expect(args.onCancel).toHaveBeenCalled();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
