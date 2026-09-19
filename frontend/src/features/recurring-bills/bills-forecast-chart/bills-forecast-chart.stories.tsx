import type { Meta, StoryObj } from "@storybook/react-vite";
import { inactiveBill, recurringBills, variableBill } from "@/storybook/fixtures";
import { BillsForecastChart } from "./bills-forecast-chart";

const meta = {
  title: "Features/RecurringBills/BillsForecastChart",
  component: BillsForecastChart,
  decorators: [
    (Story) => (
      <div className="w-[min(40rem,90vw)]">
        <Story />
      </div>
    ),
  ],
  args: { bills: recurringBills },
} satisfies Meta<typeof BillsForecastChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NothingFixed: Story = { args: { bills: [variableBill, inactiveBill] } };
