import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { getAccountsMockHandler } from "@/api/generated/accounts/accounts.msw";
import { getCreateSettlementMockHandler } from "@/api/generated/households/households.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Card } from "@/components/ui/card/card";
import {
  accounts,
  familyHousehold,
  memberUser,
  partnerSharedAccount,
  settleUp,
  settlementAccountOwnerProblem,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { SettlementForm } from "./settlement-dialog";

const meta = {
  title: "Features/Households/SettlementForm",
  component: SettlementForm,
  parameters: { route: "/households" },
  args: { household: familyHousehold, payment: settleUp.payments[0], onClose: fn() },
  render: (args) => (
    <Card className="w-[36rem] max-w-full p-6">
      <QueryBoundary fallback={null}>
        <SettlementForm {...args} />
      </QueryBoundary>
    </Card>
  ),
} satisfies Meta<typeof SettlementForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("textbox", { name: "Amount" })).toHaveValue("42.50");
  },
};

export const RecordsAPayment: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const NoVisibleAccountOfTheOtherMember: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("checkbox", { name: "Also record a transfer" }));
    await expect(
      await canvas.findByText(
        `No account of ${memberUser.displayName} in EUR is visible to you, so only the payment can be recorded.`,
      ),
    ).toBeVisible();
    await expect(canvas.queryByRole("combobox", { name: "From account" })).toBeNull();
  },
};

export const WithATransfer: Story = {
  parameters: withHandlers(getAccountsMockHandler([...accounts, partnerSharedAccount])),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("checkbox", { name: "Also record a transfer" }));
    await expect(await canvas.findByRole("combobox", { name: "From account" })).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: "To account" })).toBeVisible();
  },
};

export const WithoutASuggestion: Story = { args: { payment: undefined } };

export const ServerError: Story = {
  parameters: withHandlers(getCreateSettlementMockHandler(failWith(settlementAccountOwnerProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Record payment" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "The money must leave an account of the payer and arrive in an account of the payee.",
    );
  },
};

export const Saving: Story = {
  parameters: withHandlers(getCreateSettlementMockHandler(pending)),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Record payment" }));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /record payment/i })).toHaveAttribute(
        "aria-busy",
        "true",
      ),
    );
  },
};
