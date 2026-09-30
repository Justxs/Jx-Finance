import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { portfolio } from "@/storybook/fixtures";
import { AllocationSection } from "./allocation-section";

const meta = {
  title: "Features/Investments/AllocationSection",
  component: AllocationSection,
  decorators: [withWidth("form")],
  args: {
    holdings: portfolio.holdings,
    byType: portfolio.byType ?? [],
    byCurrency: portfolio.byCurrency ?? [],
    currency: portfolio.reportingCurrency,
  },
} satisfies Meta<typeof AllocationSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ByTypeAndCurrency: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Type" }));
    await expect(canvas.getByText("ETF")).toBeVisible();
    await userEvent.click(canvas.getByRole("radio", { name: "Currency" }));
    await expect(canvas.getByText("USD")).toBeVisible();
  },
};

export const SingleHolding: Story = { args: { holdings: portfolio.holdings.slice(0, 1) } };
