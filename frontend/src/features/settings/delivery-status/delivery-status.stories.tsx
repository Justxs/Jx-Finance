import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { DeliveryStatus } from "./delivery-status";

const meta = {
  title: "Features/Settings/DeliveryStatus",
  component: DeliveryStatus,
  parameters: { layout: "padded" },
  args: { configured: true, lastDeliveredAt: "2026-09-25T07:14:00Z", lastError: null },
} satisfies Meta<typeof DeliveryStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Delivered: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Last message delivered/u)).toBeInTheDocument();
  },
};

export const NeverDelivered: Story = {
  args: { lastDeliveredAt: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Nothing has been delivered yet.")).toBeInTheDocument();
  },
};

export const LastDeliveryFailed: Story = {
  args: { lastError: "Telegram answered 502. Try again later." },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Last problem: Telegram answered 502/u)).toBeInTheDocument();
  },
};
