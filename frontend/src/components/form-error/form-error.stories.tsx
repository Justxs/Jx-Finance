import type { Meta, StoryObj } from "@storybook/react-vite";
import { ApiError } from "@/api/client";
import { withWidth } from "@/storybook/decorators";
import { FormError } from "./form-error";

const meta = {
  title: "Components/FormError",
  component: FormError,
  decorators: [withWidth("column")],
} satisfies Meta<typeof FormError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDetail: Story = {
  args: {
    error: new ApiError({
      status: 400,
      title: "Validation failed",
      detail: "This would sell more than was held on that date; short positions are not supported.",
    }),
  },
};

export const SeveralFields: Story = {
  args: {
    error: new ApiError({
      status: 400,
      title: "Validation failed",
      errors: [
        { name: "amount", reason: "Amount must be a decimal greater than 0." },
        { name: "date", reason: "Date is required." },
      ],
    }),
  },
};

export const UnknownError: Story = { args: { error: new TypeError("offline") } };

export const PlainMessage: Story = {
  args: { message: "The bill changed since this form opened. Close it and try again." },
};

export const NoError: Story = { args: { error: null } };
