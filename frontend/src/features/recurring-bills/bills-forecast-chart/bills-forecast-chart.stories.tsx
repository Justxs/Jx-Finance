import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { inactiveBill, recurringBills, variableBill } from "@/storybook/fixtures";
import { BillsForecastChart } from "./bills-forecast-chart";

const meta = {
  title: "Features/RecurringBills/BillsForecastChart",
  component: BillsForecastChart,
  decorators: [withWidth("panel")],
  args: { bills: recurringBills },
} satisfies Meta<typeof BillsForecastChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NothingFixed: Story = { args: { bills: [variableBill, inactiveBill] } };
