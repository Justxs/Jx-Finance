import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { getReceiptItemsMockHandler } from "@/api/generated/receipts/receipts.msw";
import { withWidth } from "@/storybook/decorators";
import { noReceiptItems } from "@/storybook/fixtures";
import { loadingHandlers, withHandlers } from "@/storybook/handlers";
import { ReceiptItems } from "./receipt-items";

const meta = {
  title: "Features/Reports/ReceiptItems",
  component: ReceiptItems,
  args: { dateFrom: "2026-01-01", dateTo: "2026-12-31" },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof ReceiptItems>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Pienas Dvaro 2,5 % 1 l")).toBeVisible();
    await expect(canvas.getByText("28 times")).toBeVisible();
    await userEvent.type(canvas.getByRole("searchbox", { name: "Find an item" }), "pasta");
    await expect(canvas.getByRole("searchbox", { name: "Find an item" })).toHaveValue("pasta");
  },
};

export const NoReceipts: Story = {
  parameters: withHandlers(getReceiptItemsMockHandler(noReceiptItems)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/No receipts read in this range/u)).toBeVisible();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const Lithuanian: Story = { globals: { locale: "lt" } };
