import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import {
  dueOccurrence,
  estimatedOccurrence,
  hiddenAccountOccurrence,
  noMatchOccurrence,
  overdueOccurrence,
  paidIncomeOccurrence,
  paidOccurrence,
  unconfirmedOccurrence,
  unpricedOccurrence,
} from "@/storybook/fixtures";
import { BillChip } from "./bill-chip";

const meta = {
  title: "Features/RecurringBills/BillChip",
  component: BillChip,
  args: { occurrence: dueOccurrence, onConfirm: fn(), onEdit: fn(), onMarkDone: fn() },
  decorators: [withWidth("w-44")],
} satisfies Meta<typeof BillChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DueNext: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: `Confirm: ${dueOccurrence.name}` }),
    );
    await expect(args.onConfirm).toHaveBeenCalledOnce();
    await expect(args.onEdit).not.toHaveBeenCalled();
    await expect(canvas.getByText("Due")).toHaveClass("sr-only");
    await expect(canvas.queryByRole("button", { name: /^Mark as done/u })).toBeNull();
  },
};

export const DueLater: Story = {
  args: { occurrence: { ...dueOccurrence, isNextDue: false } },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: `Edit: ${dueOccurrence.name}` }),
    );
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

export const Estimated: Story = {
  args: { occurrence: estimatedOccurrence },
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent(/≈ Estimated €41\.20/u);
  },
};

export const Overdue: Story = {
  args: { occurrence: overdueOccurrence },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Overdue")).toBeVisible();
  },
};

export const Paid: Story = {
  args: { occurrence: paidOccurrence },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("link", { name: paidOccurrence.name })).toBeVisible();
    await expect(canvas.getByText("Paid")).toBeVisible();
  },
};

export const PaidIncome: Story = {
  args: { occurrence: paidIncomeOccurrence },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("+€2,180.00")).toBeVisible();
    await expect(canvas.getByText("Income:", { exact: false })).toBeInTheDocument();
  },
};

export const PaidNotConfirmed: Story = {
  args: { occurrence: unconfirmedOccurrence },
  play: async ({ canvas, args }) => {
    await expect(await canvas.findByText("Not confirmed")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: `Mark as done: ${unconfirmedOccurrence.name}` }),
    );
    await expect(args.onMarkDone).toHaveBeenCalledWith(unconfirmedOccurrence);
  },
};

export const PaidNotConfirmedLaterOccurrence: Story = {
  args: { occurrence: { ...unconfirmedOccurrence, isNextDue: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Not confirmed")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /^Mark as done/u })).toBeNull();
  },
};

export const MarkingDone: Story = {
  args: { occurrence: unconfirmedOccurrence, markingDone: unconfirmedOccurrence.billId },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("button", { name: `Mark as done: ${unconfirmedOccurrence.name}` }),
    ).toBeDisabled();
  },
};

export const NoMatchTransfer: Story = {
  args: { occurrence: noMatchOccurrence },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("No match")).toBeVisible();
    await expect(canvas.getByText("Transfer:", { exact: false })).toBeInTheDocument();
  },
};

export const WithoutAmount: Story = {
  args: { occurrence: unpricedOccurrence },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("No amount")).toBeVisible();
  },
};

export const AccountNotVisible: Story = {
  args: { occurrence: hiddenAccountOccurrence },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Account not visible")).toBeVisible();
  },
};
