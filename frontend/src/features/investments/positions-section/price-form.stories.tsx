import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { unpricedStock, usStock } from "@/storybook/fixtures";
import { PriceForm } from "./price-form";

const meta = {
  title: "Features/Investments/PriceForm",
  component: PriceForm,
  args: { security: usStock, pending: false, onSubmit: fn(), onCancel: fn() },
  decorators: [withWidth("form")],
} satisfies Meta<typeof PriceForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FirstPrice: Story = { args: { security: unpricedStock } };

export const Pending: Story = { args: { pending: true } };
