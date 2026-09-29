import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { linkedRefund, refundedPurchase, unlinkedRefund } from "@/storybook/fixtures";
import { RefundMark } from "./refund-mark";

const meta = {
  title: "Features/Transactions/RefundMark",
  component: RefundMark,
  parameters: { layout: "padded", route: "/transactions" },
  args: { transaction: linkedRefund },
} satisfies Meta<typeof RefundMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RefundOfAPurchase: Story = {
  play: async ({ canvas }) => {
    const link = await canvas.findByRole("link", { name: /^Refund of Zara, Akropolis, /u });
    await expect(link).toHaveAttribute("href", expect.stringContaining("search=Zara"));
  },
};

export const RefundedPurchase: Story = {
  args: { transaction: refundedPurchase },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Refunded €29.95")).toBeInTheDocument();
  },
};

export const UnlinkedRefund: Story = {
  args: { transaction: unlinkedRefund },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link")).toBeNull();
    await expect(canvas.queryByText(/Refunded/u)).toBeNull();
  },
};
