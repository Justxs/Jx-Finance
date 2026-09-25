import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { Input } from "../input/input";
import { Label } from "../label/label";
import { FieldError } from "./field-error";

const meta = {
  title: "UI/FieldError",
  component: FieldError,
  args: { id: "amount-error", message: "Enter a positive amount." },
} satisfies Meta<typeof FieldError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Enter a positive amount.")).toHaveAttribute(
      "id",
      "amount-error",
    );
  },
};

export const NoMessageRendersNothing: Story = {
  args: { message: undefined },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("#amount-error")).toBeNull();
  },
};

export const LongMessage: Story = {
  args: {
    message:
      "The amount has to be a positive number with at most two decimal places and cannot exceed the remaining balance of the selected account.",
  },
  decorators: [withWidth("w-56")],
};

export const BelowInput: Story = {
  render: (args) => (
    <div className="w-64 space-y-1.5">
      <Label htmlFor="field-error-story">Amount</Label>
      <Input
        id="field-error-story"
        defaultValue="-5"
        aria-invalid
        aria-describedby={args.message ? "field-error-story-error" : undefined}
      />
      <FieldError {...args} id="field-error-story-error" />
    </div>
  ),
};
