import type { Meta, StoryObj } from "@storybook/react-vite";
import { FieldError } from "./field-error";
import { Input } from "../input";
import { Label } from "../label";

const meta = {
  title: "UI/FieldError",
  component: FieldError,
  args: { message: "Enter a positive amount." },
} satisfies Meta<typeof FieldError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoMessageRendersNothing: Story = { args: { message: undefined } };

export const LongMessage: Story = {
  args: {
    message:
      "The amount has to be a positive number with at most two decimal places and cannot exceed the remaining balance of the selected account.",
  },
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
};

export const BelowInput: Story = {
  render: (args) => (
    <div className="w-64 space-y-1.5">
      <Label htmlFor="field-error-story">Amount</Label>
      <Input id="field-error-story" defaultValue="-5" aria-invalid />
      <FieldError {...args} />
    </div>
  ),
};
