import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { AllocationDrift } from "./allocation-drift";

const meta = {
  title: "Features/Investments/AllocationDrift",
  component: AllocationDrift,
  decorators: [withWidth("form")],
  args: {
    currency: "eur",
    rows: [
      { id: "etf", name: "ETF", value: 5459.55, target: 60 },
      { id: "stock", name: "Stock", value: 5115.44, target: 30 },
      { id: "bond", name: "Bond", value: 0, target: 10 },
    ],
  },
} satisfies Meta<typeof AllocationDrift>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Target 60%/)).toBeVisible();
    await expect(canvas.getByText(/18\.4 points above/)).toBeVisible();
    await expect(canvas.getByText(/10\.0 points below/)).toBeVisible();
    await expect(
      canvas.getByText("Arithmetic on recorded holdings at their last prices, not advice."),
    ).toBeVisible();
  },
};

export const SplitsANewAmount: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "New amount to invest" }), "1000");
    await expect(canvas.getByText(/Add €922\.79/)).toBeVisible();
    await expect(canvas.getByText(/Add €77\.21/)).toBeVisible();
    await expect(canvas.getAllByText(/^Add €/)).toHaveLength(2);
    await expect(canvas.getByRole("status")).toHaveTextContent("€1,000.00 goes to the buckets");
  },
};

export const RefusesAnInvalidAmount: Story = {
  play: async ({ canvas }) => {
    const amount = canvas.getByRole("textbox", { name: "New amount to invest" });
    await userEvent.type(amount, "12.345");
    await expect(amount).toHaveAttribute("aria-invalid", "true");
    await expect(
      canvas.getByText("Enter an amount above zero with at most two decimals."),
    ).toBeVisible();
    await expect(canvas.queryByText(/^Add /)).toBeNull();
  },
};

export const NothingHeldYet: Story = {
  args: {
    rows: [
      { id: "etf", name: "ETF", value: 0, target: 80 },
      { id: "bond", name: "Bond", value: 0, target: 20 },
    ],
  },
};

export const Phone: Story = {
  decorators: [withWidth("w-[343px]")],
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
};
