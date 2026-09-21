import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import {
  mortgageSchedule,
  mortgageScheduleWithExtra,
  zeroRateSchedule,
} from "@/storybook/fixtures";
import { DebtBalanceChart } from "./debt-balance-chart";

const meta = {
  title: "Features/NetWorth/DebtBalanceChart",
  component: DebtBalanceChart,
  args: { plan: mortgageSchedule.plan, withExtra: null },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof DebtBalanceChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithOverpayments: Story = {
  args: { withExtra: mortgageScheduleWithExtra.withExtra },
};

export const ZeroRate: Story = {
  args: { plan: zeroRateSchedule.plan },
};
