import type { TransferResponse } from "@/api/generated/model";
import { ids } from "./base";
import { problemOf } from "./problems";

export const manualTransfer: TransferResponse = {
  id: ids.transfers.toSavings,
  fromAccountId: ids.accounts.checking,
  toAccountId: ids.accounts.savings,
  amount: "400.00",
  date: "2026-09-11",
  description: "Mėnesio taupymas",
  currency: "eur",
  receivedAmount: "400.00",
  receivedCurrency: "eur",
  createdAt: "2026-09-11T07:05:00Z",
  fromAccountImported: false,
  toAccountImported: false,
};

const sharedAccountTransfer: TransferResponse = {
  id: ids.transfers.toShared,
  fromAccountId: ids.accounts.checking,
  toAccountId: ids.accounts.shared,
  amount: "900.00",
  date: "2026-09-10",
  description:
    "Rugsėjo įnašas į bendrą šeimos sąskaitą (maistas, komunaliniai, paskola, vaikų būreliai)",
  currency: "eur",
  receivedAmount: "900.00",
  receivedCurrency: "eur",
  createdAt: "2026-09-10T18:22:00Z",
  fromAccountImported: false,
  toAccountImported: false,
};

export const importedFromTransfer: TransferResponse = {
  id: ids.transfers.cashWithdrawal,
  fromAccountId: ids.accounts.checking,
  toAccountId: ids.accounts.cash,
  amount: "100.00",
  date: "2026-08-29",
  description: null,
  currency: "eur",
  receivedAmount: "100.00",
  receivedCurrency: "eur",
  createdAt: "2026-08-29T12:40:00Z",
  fromAccountImported: true,
  toAccountImported: false,
};

const sameCurrencyTransfers: TransferResponse[] = [
  manualTransfer,
  sharedAccountTransfer,
  importedFromTransfer,
];

export const crossCurrencyTransfer: TransferResponse = {
  id: ids.transfers.toBroker,
  fromAccountId: ids.accounts.checking,
  toAccountId: ids.accounts.broker,
  amount: "1000.00",
  currency: "eur",
  receivedAmount: "1084.20",
  receivedCurrency: "usd",
  date: "2026-09-12",
  description: "Papildymas doleriais",
  createdAt: "2026-09-12T09:10:00Z",
  fromAccountImported: false,
  toAccountImported: false,
};

export const importedToCrossCurrencyTransfer: TransferResponse = {
  ...crossCurrencyTransfer,
  toAccountImported: true,
};

export const importedBothTransfer: TransferResponse = {
  ...manualTransfer,
  fromAccountImported: true,
  toAccountImported: true,
};

export const transferLockedProblem = problemOf(
  400,
  "value.locked",
  "The amount of an imported bank entry cannot change.",
  { name: "amount" },
);

export const transferAmountMismatchProblem = problemOf(
  400,
  "transfer.amountMismatch",
  "Sent and received amounts must match in the same currency.",
  { name: "receivedAmount" },
);

export const transferForbiddenProblem = problemOf(
  403,
  "access.forbidden",
  "You need access to both accounts of a transfer.",
);

export const transfers: TransferResponse[] = [crossCurrencyTransfer, ...sameCurrencyTransfers];
