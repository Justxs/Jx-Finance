import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { unpricedStock, usStock } from "@/storybook/investment-fixtures";
import { PriceForm } from "./price-form";

const meta = {
  title: "Features/Investments/PriceForm",
  component: PriceForm,
  args: { security: usStock, pending: false, onSubmit: fn(), onCancel: fn() },
  render: (args) => (
    <div className="w-[min(32rem,90vw)]">
      <PriceForm {...args} />
    </div>
  ),
} satisfies Meta<typeof PriceForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FirstPrice: Story = { args: { security: unpricedStock } };

export const Pending: Story = { args: { pending: true } };
