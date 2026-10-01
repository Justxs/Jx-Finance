import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";
import type { ImportPreviewRow } from "@/api/generated/model";
import {
  accounts,
  camtPreviewRows,
  checkingAccount,
  ids,
  importPreviewRows,
} from "@/storybook/fixtures";
import { errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { ImportTransferPicker } from "./import-transfer-picker";
import { type PreviewRowState, toPreviewRows } from "./preview-rows";

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
  suggestedCategoryId: null,
  suggestedTagIds: [],
  matchedRuleName: null,
  isReversal: false,
  suggestedTransferAccountId: null,
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
    existingTransactionId: "",
    asRefund: false,
    refundOfTransactionId: "",
    categoryId: "",
    categorySuggested: false,
    learnedConfidence: null,
    ruleName: null,
    tagIds: [],
    spreadMonths: null,
    spreadDirection: "forward",
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

export const LinkedToEntry: Story = {
  args: {
    row: toState(
      {
        ...fallbackRow,
        matchedTransaction: {
          id: ids.transactions.uncategorised,
          date: "2026-09-17",
          description: "Savings",
          categoryId: null,
        },
      },
      { existingTransactionId: ids.transactions.uncategorised },
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "Record as" })).toHaveTextContent(
      "Your entry of",
    );
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

const reversalRow = camtPreviewRows.find((row) => row.isReversal);

export const ProposedAsRefund: Story = {
  args: {
    row: toPreviewRows(reversalRow ? [reversalRow] : [], [], [])[0] ?? toState(undefined, {}),
  },
  play: async ({ canvas }) => {
    const recordAs = canvas.getByRole("combobox", { name: "Record as" });
    await expect(recordAs).toHaveTextContent("Refund of");
    await chooseOption(recordAs, "Refund");
    await expect(recordAs).not.toHaveTextContent("Refund of");
    await chooseOption(recordAs, "Income / expense");
    await expect(recordAs).toHaveTextContent("Income / expense");
  },
};
