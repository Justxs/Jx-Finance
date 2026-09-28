import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import {
  mortgageSchedule,
  mortgageScheduleWithExtra,
  zeroRateSchedule,
} from "@/storybook/fixtures";
import { DebtScheduleTable } from "./debt-schedule-table";

const meta = {
  title: "Features/NetWorth/DebtScheduleTable",
  component: DebtScheduleTable,
  args: { plan: mortgageSchedule.plan, asOf: mortgageSchedule.asOf, currency: "eur" },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof DebtScheduleTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithOverpayments: Story = {
  args: { plan: mortgageScheduleWithExtra.withExtra ?? mortgageSchedule.plan },
};

export const ZeroRate: Story = {
  args: { plan: zeroRateSchedule.plan, asOf: zeroRateSchedule.asOf },
};

export const NotStartedYet: Story = {
  args: { asOf: "2020-01-01" },
};

export const PagingForward: Story = {
  play: async ({ canvas }) => {
    const range = /^\d+–\d+ of \d+$/u;
    const before = canvas.getByText(range).textContent;
    const page = Number(canvas.getByRole<HTMLInputElement>("textbox", { name: "Page" }).value);
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));
    await expect(canvas.getByText(range).textContent).not.toBe(before);
    await expect(canvas.getByRole("textbox", { name: "Page" })).toHaveValue(String(page + 1));
    await expect(canvas.getAllByRole("row")).toHaveLength(13);
  },
};
