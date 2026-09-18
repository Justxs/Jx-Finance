import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
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
  decorators: [
    function withFormWidth(Story) {
      return (
        <div className="w-[min(36rem,calc(100vw-3rem))]">
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof HoldingForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAsOf: Story = { args: { withAsOf: true } };

export const WithInterestRate: Story = { args: { withInterestRate: true } };

export const Pending: Story = { args: { pending: true } };

export const InvalidInterestRate: Story = {
  args: { withInterestRate: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "Mortgage");
    await userEvent.type(fields[1]!, "98450,32");
    await userEvent.type(fields[2]!, "4,5,1");
  },
};
