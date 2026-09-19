import type { Meta, StoryObj } from "@storybook/react-vite";
import { portfolio } from "@/storybook/investment-fixtures";
import { AllocationSection } from "./allocation-section";

const meta = {
  title: "Features/Investments/AllocationSection",
  component: AllocationSection,
  decorators: [
    (Story) => (
      <div className="w-[min(32rem,90vw)]">
        <Story />
      </div>
    ),
  ],
  args: { holdings: portfolio.holdings, currency: portfolio.reportingCurrency },
} satisfies Meta<typeof AllocationSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleHolding: Story = { args: { holdings: portfolio.holdings.slice(0, 1) } };
