import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { portfolio } from "@/storybook/fixtures";
import { IncomeByYear } from "./income-by-year";

const meta = {
  title: "Features/Investments/IncomeByYear",
  component: IncomeByYear,
  args: { years: portfolio.years, currency: portfolio.reportingCurrency },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof IncomeByYear>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const RealisedLoss: Story = {
  args: {
    years: [
      {
        year: 2026,
        dividends: "0.00",
        withholdingTax: "0.00",
        interest: "1.20",
        fees: "12.00",
        realizedGain: "-318.44",
      },
    ],
  },
};

export const Empty: Story = { args: { years: [] } };

export const Lithuanian: Story = { globals: { locale: "lt" } };
