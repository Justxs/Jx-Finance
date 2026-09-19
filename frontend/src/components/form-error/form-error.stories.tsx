import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormError } from "./form-error";

const meta = {
  title: "Components/FormError",
  component: FormError,
  decorators: [
    (Story) => (
      <div className="w-[min(90vw,28rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDetail: Story = {
  args: {
    error: {
      status: 400,
      title: "Validation failed",
      detail: "This would sell more than was held on that date; short positions are not supported.",
    },
  },
};

export const SeveralFields: Story = {
  args: {
    error: {
      status: 400,
      title: "Validation failed",
      errors: [
        { name: "amount", reason: "Amount must be a decimal greater than 0." },
        { name: "date", reason: "Date is required." },
      ],
    },
  },
};

export const UnknownError: Story = { args: { error: new TypeError("offline") } };

export const NoError: Story = { args: { error: null } };
