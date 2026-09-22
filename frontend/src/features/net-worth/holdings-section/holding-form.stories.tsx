import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { HoldingForm } from "./holding-form";

const meta = {
  title: "Features/NetWorth/HoldingForm",
  component: HoldingForm,
  args: {
    idPrefix: "holding",
    typeOptions: [
      { value: "loan", label: "Loan" },
      { value: "other", label: "Other" },
    ],
    defaultType: "other",
    amountLabel: "Amount",
    pending: false,
    onSubmit: fn(),
    onCancel: fn(),
  },
  decorators: [withWidth("w-[min(36rem,calc(100vw-3rem))]")],
} satisfies Meta<typeof HoldingForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAsOf: Story = { args: { withAsOf: true } };

export const Pending: Story = { args: { pending: true } };
