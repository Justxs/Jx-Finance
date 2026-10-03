import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { withPageFrame } from "@/storybook/decorators";
import { accounts, checkingAccount, ids, sharedAccount } from "@/storybook/fixtures";
import { AccountsTable } from "./accounts-table";

const meta = {
  title: "Features/Accounts/AccountsTable",
  component: AccountsTable,
  parameters: { layout: "fullscreen", route: "/accounts" },
  args: {
    accounts,
    stale: false,
    onEdit: fn(),
    deletingId: null,
    onDelete: fn(),
    onConvert: fn(),
    onReconcile: fn(),
    positiveTotal: accounts.reduce(
      (sum, account) => sum + Math.max(0, Number(account.reportingBalance)),
      0,
    ),
  },
  decorators: [withPageFrame],
} satisfies Meta<typeof AccountsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { accounts: [] } };

export const FilteredNoMatches: Story = {
  args: { accounts: [] },
  parameters: { route: "/accounts?search=nothing&type=cash" },
};

export const Sorted: Story = { parameters: { route: "/accounts?sort=name&direction=asc" } };

export const Stale: Story = { args: { stale: true } };

export const Deleting: Story = { args: { deletingId: ids.accounts.savings } };

export const CreditCard: Story = {
  args: {
    accounts: [
      checkingAccount,
      {
        ...checkingAccount,
        id: "cccccccc-0000-4000-8000-000000000001",
        name: "Visa card",
        type: "creditCard",
        iban: null,
        currentBalance: "-450.20",
        reportingBalance: "-450.20",
        balances: [],
      },
    ],
  },
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText(/Owed €450.20|Skola 450,20/u))[0]).toBeVisible();
  },
};

export const LongContent: Story = {
  args: {
    accounts: [
      {
        ...checkingAccount,
        name: "Everyday current account used for salary, groceries, subscriptions and all card payments",
        description:
          "Salary lands here on the 10th, standing orders leave on the 11th, and whatever is left at the end of the month is swept into savings.",
        currentBalance: "1234567890.12",
      },
      sharedAccount,
    ],
  },
};

const longLithuanianName =
  "Šeimos bendra einamoji sąskaita kasdienėms išlaidoms, komunaliniams mokesčiams ir vaikų būrelių įmokoms";

export const ManyCurrenciesLongName: Story = {
  args: {
    accounts: [
      {
        ...checkingAccount,
        name: longLithuanianName,
        currentBalance: "1234567890.12",
        reportingBalance: "1234567890.12",
        holdingsValue: "987654321.09",
        balances: [
          { currency: "eur", amount: "1234567890.12" },
          { currency: "usd", amount: "23456789.01" },
          { currency: "gbp", amount: "3456789.12" },
          { currency: "huf", amount: "456789012.00" },
          { currency: "jpy", amount: "567890123.00" },
          { currency: "pln", amount: "6789012.34" },
          { currency: "idr", amount: "7890123456.00" },
        ],
      },
      sharedAccount,
    ],
    positiveTotal: 1234567890.12 + Number(sharedAccount.reportingBalance),
  },
  play: async ({ canvas }) => {
    const names = await canvas.findAllByText(longLithuanianName);
    await Promise.all(names.map((name) => expect(name).toHaveClass("wrap-break-word")));
    await expect(canvas.getAllByText(/^IDR\s7,890,123,456(?:\.00)?$/u)).not.toHaveLength(0);
  },
};
