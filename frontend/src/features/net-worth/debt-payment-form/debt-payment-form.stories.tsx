import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { getLinkDebtPaymentMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { withWidth } from "@/storybook/decorators";
import {
  mortgagePayments,
  referenceNotSharedProblem,
  sharedTrackedMortgage,
  trackedMortgage,
  uid,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { DebtPaymentForm } from "./debt-payment-form";

const meta = {
  title: "Features/NetWorth/DebtPaymentForm",
  component: DebtPaymentForm,
  args: {
    debts: [sharedTrackedMortgage],
    transactionId: uid("55555555", 15),
    onClose: fn(),
  },
  decorators: [withWidth("dialog")],
} satisfies Meta<typeof DebtPaymentForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EditingPayment: Story = {
  args: { debts: [trackedMortgage], transactionId: undefined, payment: mortgagePayments[3] },
};

export const NoDebts: Story = { args: { debts: [] } };

export const SubmitPending: Story = {
  parameters: withHandlers(getLinkDebtPaymentMockHandler(pending)),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^(save|išsaugoti)$/i }));
  },
};

export const AccountNotShared: Story = {
  parameters: withHandlers(getLinkDebtPaymentMockHandler(failWith(referenceNotSharedProblem))),
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^(save|išsaugoti)$/i }));
    await expect(await canvas.findByRole("alert")).toBeVisible();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};
