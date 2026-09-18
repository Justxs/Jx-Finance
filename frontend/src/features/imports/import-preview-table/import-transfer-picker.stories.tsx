import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { ImportPreviewRow } from "@/api/generated/model";
import { accounts, checkingAccount, ids, importPreviewRows } from "@/storybook/fixtures";
import { errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { ImportTransferPicker } from "./import-transfer-picker";
import type { PreviewRowState } from "./preview-rows";

interface HarnessProps {
  row: PreviewRowState;
  accountId: string;
  singleAccount?: boolean;
}

const sharedContributionRow = importPreviewRows.find(
  (row) => row.looksLikeTransfer && row.type === "income",
);
const savingsRow = importPreviewRows.find((row) => row.looksLikeTransfer && row.type === "expense");

const fallbackRow: ImportPreviewRow = {
  importRef: "2026091800000099",
  date: "2026-09-18",
  payee: "Own account",
  description: "Transfer between own accounts",
  amount: "250.00",
  type: "expense",
  isDuplicate: false,
  looksLikeTransfer: true,
  currency: "eur",
};

function toState(
  row: ImportPreviewRow | undefined,
  patch: Partial<PreviewRowState>,
): PreviewRowState {
  return {
    ...(row ?? fallbackRow),
    selected: true,
    transferAccountId: "",
    existingTransferId: "",
    categoryId: "",
    categorySuggested: false,
    ...patch,
  };
}

function TransferPickerHarness({ row, accountId, singleAccount = false }: Readonly<HarnessProps>) {
  const [state, setState] = useState(row);

  return (
    <div className="w-64">
      <ImportTransferPicker
        row={state}
        accountId={accountId}
        accounts={singleAccount ? [checkingAccount] : accounts}
        onChange={(patch) => setState((previous) => ({ ...previous, ...patch }))}
      />
    </div>
  );
}

const meta = {
  title: "Features/Imports/ImportTransferPicker",
  component: TransferPickerHarness,
  args: { row: toState(savingsRow, {}), accountId: ids.accounts.checking },
} satisfies Meta<typeof TransferPickerHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TransferAccountChosen: Story = {
  args: { row: toState(savingsRow, { transferAccountId: ids.accounts.savings }) },
};

export const WithMatchingTransfer: Story = {
  args: {
    accountId: ids.accounts.shared,
    row: toState(sharedContributionRow, { transferAccountId: ids.accounts.checking }),
  },
};

export const MatchSelected: Story = {
  args: {
    accountId: ids.accounts.shared,
    row: toState(sharedContributionRow, {
      transferAccountId: ids.accounts.checking,
      existingTransferId: ids.transfers.toShared,
    }),
  },
};

export const NoOtherAccounts: Story = { args: { singleAccount: true } };

export const MatchesLoading: Story = {
  args: { row: toState(savingsRow, { transferAccountId: ids.accounts.savings }) },
  parameters: { msw: { handlers: loadingHandlers } },
};

export const MatchesError: Story = {
  args: { row: toState(savingsRow, { transferAccountId: ids.accounts.savings }) },
  parameters: { msw: { handlers: errorHandlers } },
};
