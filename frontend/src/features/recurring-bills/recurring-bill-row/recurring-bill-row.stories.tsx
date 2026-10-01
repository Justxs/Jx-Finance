import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { Rows } from "@/components/ui/rows/rows";
import { byId, nameById } from "@/lib/options";
import {
  accounts,
  categories,
  dueSoonBill,
  familyHousehold,
  inactiveBill,
  incomeBill,
  overdueBill,
  priceRiseBill,
  recurringBills,
  savingsAccount,
  transferBill,
  variableBill,
} from "@/storybook/fixtures";
import { chooseMenuItem } from "@/storybook/interactions";
import { RecurringBillRow } from "./recurring-bill-row";

const longNameBill = recurringBills.find((bill) => bill.accountId === null) ?? dueSoonBill;

const meta = {
  title: "Features/RecurringBills/RecurringBillRow",
  component: RecurringBillRow,
  args: {
    bill: dueSoonBill,
    accountById: byId(accounts),
    categoryNames: nameById(categories),
    onEdit: fn(),
    onConfirm: fn(),
    onDelete: fn(),
    deletePending: false,
    deleteDisabled: false,
  },
  decorators: [
    function withList(Story) {
      return (
        <Rows className="w-[min(56rem,calc(100vw-3rem))]">
          <Story />
        </Rows>
      );
    },
  ],
} satisfies Meta<typeof RecurringBillRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DueSoon: Story = { args: { bill: dueSoonBill } };

export const Overdue: Story = { args: { bill: overdueBill } };

export const PriceRise: Story = {
  args: { bill: priceRiseBill, onUpdateAmount: fn() },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText(/Charged €27\.99 on .*, expected €24\.99/u)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Update expected amount" }));
    await expect(args.onUpdateAmount).toHaveBeenCalledOnce();
  },
};

export const PriceRiseOnAVariableEntry: Story = {
  args: {
    bill: {
      ...variableBill,
      latestMatch: { date: "2026-09-03", amount: "61.40", expected: "48.20", isPriceRise: true },
    },
    onUpdateAmount: fn(),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/expected €48\.20/u)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Update expected amount" })).toBeNull();
  },
};

export const Variable: Story = { args: { bill: variableBill } };

export const Inactive: Story = { args: { bill: inactiveBill } };

export const Income: Story = {
  args: { bill: incomeBill },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Income")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Record income" })).toBeVisible();
  },
};

export const Transfer: Story = {
  args: { bill: transferBill },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Transfer")).toBeVisible();
    await expect(canvas.getByText(new RegExp(`→ ${savingsAccount.name}`, "u"))).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Record transfer" })).toBeVisible();
  },
};

export const RecordTransferRequestsConfirm: Story = {
  args: { bill: transferBill },
  play: async ({ args, canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: /^(record transfer|registruoti pervedimą)$/i }),
    );
    await expect(args.onConfirm).toHaveBeenCalledOnce();
  },
};

export const LongNameYearlyNoAccount: Story = { args: { bill: longNameBill } };

export const NoCategoryNoAccount: Story = {
  args: { bill: { ...dueSoonBill, categoryId: null, accountId: null } },
};

export const UnknownCategoryAndAccount: Story = {
  args: { accountById: new Map(), categoryNames: new Map() },
};

export const DeletePending: Story = { args: { deletePending: true, deleteDisabled: true } };

export const DeleteDisabled: Story = { args: { deleteDisabled: true } };

export const EditRequestsEdit: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^(edit|redaguoti)(:|$)/i }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
  },
};

export const InactiveCannotRecord: Story = {
  args: { bill: inactiveBill },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /^(record payment|registruoti mokėjimą)$/i }),
    ).toBeDisabled();
  },
};

export const MarkDoneWhenDue: Story = {
  args: { bill: overdueBill, onMarkDone: fn() },
  play: async ({ args, canvas }) => {
    await chooseMenuItem(
      canvas.getByRole("button", { name: `Actions: ${overdueBill.name}` }),
      "Mark as done",
    );
    await expect(args.onMarkDone).toHaveBeenCalledOnce();
  },
};

export const MarkDonePending: Story = {
  args: { bill: dueSoonBill, onMarkDone: fn(), markDonePending: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: `Actions: ${dueSoonBill.name}` }),
    ).toHaveAttribute("aria-busy", "true");
  },
};

export const NoMarkDoneForALaterEntry: Story = {
  args: { bill: incomeBill, onMarkDone: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button", { name: /^Actions:/u })).toBeNull();
    await expect(canvas.queryByRole("button", { name: /^Mark as done/u })).toBeNull();
  },
};

export const SharedWithHousehold: Story = {
  args: { bill: { ...dueSoonBill, scope: "shared", householdId: familyHousehold.id } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Shared · Kazlauskų šeima")).toBeVisible();
  },
};
