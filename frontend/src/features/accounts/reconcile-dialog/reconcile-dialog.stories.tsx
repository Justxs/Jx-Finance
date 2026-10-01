import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, within } from "storybook/test";
import {
  getReconciliationPreviewMockHandler,
  getReconciliationsMockHandler,
  getRecordReconciliationMockHandler,
} from "@/api/generated/accounts/accounts.msw";
import {
  brokerAccount,
  checkingAccount,
  firstReconciliationPreview,
  longReconciliationPreview,
  reconciliationFutureDateProblem,
  serverErrorProblem,
  usdReconciliationPreview,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { chooseOption, first, openedDialog } from "@/storybook/interactions";
import { ReconcileDialog } from "./reconcile-dialog";

const meta = {
  title: "Features/Accounts/ReconcileDialog",
  component: ReconcileDialog,
  args: { account: checkingAccount, onClose: fn() },
} satisfies Meta<typeof ReconcileDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

async function typeBalance(value: string) {
  const dialog = within(await openedDialog());
  await dialog.findByText(/Ledger balance on .*: €4,598\.17/);
  await fireEvent.change(dialog.getByLabelText(/Balance on the statement/), { target: { value } });
  return dialog;
}

export const Matching: Story = {
  play: async () => {
    const dialog = await typeBalance("4598.17");
    await expect(await dialog.findByRole("status")).toHaveTextContent("Matches the statement");
    await expect(dialog.getByText(/Rows since the reconciliation on/)).toBeVisible();
    await expect(dialog.getByText("Transfer out")).toBeVisible();
    await expect(dialog.getByText("Maxima")).toBeVisible();
    await expect(dialog.queryByRole("combobox", { name: "Statement currency" })).toBeNull();
  },
};

export const OtherCurrency: Story = {
  args: { account: brokerAccount },
  parameters: withHandlers(getReconciliationPreviewMockHandler(usdReconciliationPreview)),
  play: async () => {
    const dialog = within(await openedDialog());
    await chooseOption(dialog.getByRole("combobox", { name: "Statement currency" }), "USD");
    await expect(dialog.getByLabelText("Balance on the statement (USD)")).toBeVisible();
    await expect(await dialog.findByText(/Ledger balance on .*2,710\.40/)).toBeVisible();
  },
};

export const Differing: Story = {
  play: async () => {
    const dialog = await typeBalance("4610.47");
    const verdict = await dialog.findByRole("status");
    await expect(verdict).toHaveTextContent("€12.30 more on the statement");
    await expect(verdict).toHaveClass("text-expense");
  },
};

export const FirstReconciliation: Story = {
  parameters: withHandlers(
    getReconciliationPreviewMockHandler(firstReconciliationPreview),
    getReconciliationsMockHandler([]),
  ),
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(await dialog.findByText(/Rows up to/)).toBeVisible();
    await expect(
      await dialog.findByText("No statement balance is recorded for this account yet."),
    ).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Open in the ledger" })).not.toHaveAttribute(
      "href",
      expect.stringContaining("dateFrom"),
    );
  },
};

export const MoreThanAHundredRows: Story = {
  parameters: withHandlers(getReconciliationPreviewMockHandler(longReconciliationPreview)),
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(await dialog.findByText("and 40 more rows")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Open in the ledger" })).toHaveAttribute(
      "href",
      expect.stringContaining("dateFrom=2026-09-01"),
    );
  },
};

export const FutureDateRefused: Story = {
  parameters: withHandlers(
    getRecordReconciliationMockHandler(failWith(reconciliationFutureDateProblem)),
  ),
  play: async () => {
    const dialog = await typeBalance("4598.17");
    await userEvent.click(dialog.getByRole("button", { name: "Save reconciliation" }));
    await expect(
      await dialog.findByText("The statement date cannot be after today."),
    ).toBeVisible();
  },
};

export const SavePending: Story = {
  parameters: withHandlers(getRecordReconciliationMockHandler(pending)),
  play: async () => {
    const dialog = await typeBalance("4598.17");
    const save = dialog.getByRole("button", { name: "Save reconciliation" });
    await userEvent.click(save);
    await expect(save).toBeDisabled();
  },
};

export const PreviewFails: Story = {
  parameters: withHandlers(getReconciliationPreviewMockHandler(failWith(serverErrorProblem))),
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(await dialog.findByText("The ledger balance could not be loaded.")).toBeVisible();
  },
};

export const EarlierListFails: Story = {
  parameters: withHandlers(getReconciliationsMockHandler(failWith(serverErrorProblem))),
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(
      await dialog.findByText("Earlier reconciliations could not be loaded."),
    ).toBeVisible();
  },
};

export const DeleteEarlier: Story = {
  play: async () => {
    const dialog = within(await openedDialog());
    await userEvent.click(first(await dialog.findAllByRole("button", { name: /^Delete:/ })));
    const confirm = within(await openedDialog("alertdialog"));
    await expect(confirm.getByText("Delete this reconciliation?")).toBeVisible();
  },
};
