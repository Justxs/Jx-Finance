import type { Meta, StoryObj } from "@storybook/react-vite";
import { ApproximateAmount } from "./approximate-amount";

const meta = {
  title: "Components/ApproximateAmount",
  component: ApproximateAmount,
  args: { value: 1284.5, currency: "eur" },
} satisfies Meta<typeof ApproximateAmount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
