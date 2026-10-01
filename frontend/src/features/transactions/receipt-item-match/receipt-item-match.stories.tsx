import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { ReceiptItemMatch } from "./receipt-item-match";

const meta = {
  title: "Features/Transactions/ReceiptItemMatch",
  component: ReceiptItemMatch,
  parameters: { layout: "padded" },
  args: {
    transaction: { receiptItem: { name: "DYSON V8 dulkių siurblys", warrantyUntil: "2028-09-12" } },
  },
} satisfies Meta<typeof ReceiptItemMatch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithWarranty: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(/^Receipt item: DYSON V8 dulkių siurblys · warranty until .*2028$/u),
    ).toBeInTheDocument();
  },
};

export const WithoutWarranty: Story = {
  args: { transaction: { receiptItem: { name: "Philips trimmer", warrantyUntil: null } } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Receipt item: Philips trimmer")).toBeInTheDocument();
  },
};

export const NoMatch: Story = {
  args: { transaction: { receiptItem: null } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Receipt item/u)).toBeNull();
  },
};
