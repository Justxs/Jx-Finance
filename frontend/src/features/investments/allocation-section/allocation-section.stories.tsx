import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { portfolio } from "@/storybook/fixtures";
import { AllocationSection } from "./allocation-section";

const meta = {
  title: "Features/Investments/AllocationSection",
  component: AllocationSection,
  decorators: [withWidth("form")],
  args: { holdings: portfolio.holdings, currency: portfolio.reportingCurrency },
} satisfies Meta<typeof AllocationSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleHolding: Story = { args: { holdings: portfolio.holdings.slice(0, 1) } };
