import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import {
  linearSchedule,
  mortgageSchedule,
  mortgageScheduleWithExtra,
  zeroRateSchedule,
} from "@/storybook/fixtures";
import { DebtPaymentSplitChart } from "./debt-payment-split-chart";

const meta = {
  title: "Features/NetWorth/DebtPaymentSplitChart",
  component: DebtPaymentSplitChart,
  args: { plan: mortgageSchedule.plan },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof DebtPaymentSplitChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Linear: Story = { args: { plan: linearSchedule.plan } };

export const ZeroRate: Story = { args: { plan: zeroRateSchedule.plan } };

export const WithOverpayments: Story = {
  args: { plan: mortgageScheduleWithExtra.withExtra ?? mortgageSchedule.plan },
};
