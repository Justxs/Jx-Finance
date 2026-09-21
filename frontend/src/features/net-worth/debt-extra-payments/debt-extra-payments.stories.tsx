import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { mortgageSchedule, mortgageScheduleWithExtra } from "@/storybook/fixtures";
import { DebtExtraPayments, noExtraPayments } from "./debt-extra-payments";

const meta = {
  title: "Features/NetWorth/DebtExtraPayments",
  component: DebtExtraPayments,
  args: {
    idPrefix: "extra",
    draft: noExtraPayments,
    schedule: mortgageSchedule,
    onChange: fn(),
  },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof DebtExtraPayments>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSavings: Story = {
  args: {
    draft: { ...noExtraPayments, extraMonthly: "150.00" },
    schedule: mortgageScheduleWithExtra,
  },
};

export const InvalidAmount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(/extra each month|papildomai kas mėnesį/i);
    await userEvent.type(input, "abc");
    await expect(input).toHaveAttribute("aria-invalid", "true");
  },
};

export const LumpSumNeedsADate: Story = {
  args: { draft: { ...noExtraPayments, lumpSum: "5000" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/pick the date of the one-off payment|pasirinkite vienkartinės/i),
    ).toBeInTheDocument();
  },
};
