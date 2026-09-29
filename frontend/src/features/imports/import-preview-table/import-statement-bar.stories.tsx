import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { withWidth } from "@/storybook/decorators";
import {
  accounts,
  camtPreviewOtherAccount,
  camtPreviewRows,
  camtStatement,
} from "@/storybook/fixtures";
import { ImportStatementBar } from "./import-statement-bar";
import { toPreviewRows } from "./preview-rows";

const rows = toPreviewRows(camtPreviewRows, [], []);

const meta = {
  title: "Features/Imports/ImportStatementBar",
  component: ImportStatementBar,
  args: {
    statement: camtStatement,
    format: "camt053",
    rows,
    accounts,
    onSwitchAccount: (accountId) => toast.message(`Switch to ${accountId}`),
  },
  decorators: [withWidth("panel")],
} satisfies Meta<typeof ImportStatementBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BalanceDiffers: Story = {};

export const BalanceAgrees: Story = {
  args: { rows: rows.map((row) => ({ ...row, selected: !row.isDuplicate })) },
};

export const OtherAccountsIban: Story = { args: { statement: camtPreviewOtherAccount.statement } };

export const IbanOfNoKnownAccount: Story = {
  args: {
    statement: { ...camtStatement, iban: "LT000000000000000001", ibanMatchesAccount: false },
  },
};

export const SkippedAndUnreadableEntries: Story = {
  args: { statement: { ...camtStatement, notBooked: 3, unreadable: 1 } },
};

export const LedgerInAnotherCurrency: Story = {
  args: { statement: { ...camtStatement, ledgerBalanceAtClose: null } },
};

export const Disabled: Story = {
  args: { statement: camtPreviewOtherAccount.statement, disabled: true },
};
