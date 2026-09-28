import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { getAccountsMockHandler } from "@/api/generated/accounts/accounts.msw";
import { withWidth } from "@/storybook/decorators";
import { accounts, checkingAccount, uid, withBalance } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { AccountBalances } from "./account-balances";

const meta = {
  title: "Features/Dashboard/AccountBalances",
  component: AccountBalances,
  decorators: [withWidth("column")],
} satisfies Meta<typeof AccountBalances>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

function extraAccount(index: number, name: string, balance: string) {
  return withBalance(
    { ...checkingAccount, id: uid("33333399", index), name, type: "other" },
    balance,
  );
}

const manyAccounts = [
  ...accounts,
  extraAccount(1, "Revolut kredito kortelė", "-1840.25"),
  extraAccount(2, "Paysera", "42.10"),
  extraAccount(3, "Kelionių taupyklė", "18.00"),
];

export const ManyAccounts: Story = {
  parameters: withHandlers(getAccountsMockHandler(manyAccounts)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Revolut kredito kortelė")).toBeVisible();
    await expect(canvas.getByText(/3 other accounts|dar 3 sąskaitos/i)).toBeVisible();
  },
};
