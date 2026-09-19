import type { TransferResponse } from "@/api/generated/model";
import { ids } from "./base";

const sameCurrencyTransfers: TransferResponse[] = [
  {
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
  },
  {
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
  },
  {
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
  },
];

const crossCurrencyTransfer: TransferResponse = {
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
};

export const transfers: TransferResponse[] = [crossCurrencyTransfer, ...sameCurrencyTransfers];
