import type {
  AssetResponse,
  DebtResponse,
  NetWorthHistoryResponse,
  NetWorthResponse,
  NetWorthSnapshotItem,
} from "@/api/generated/model";
import { accounts } from "./accounts";
import { fromCents, ids, toCents, totalOf } from "./base";

export const assets: AssetResponse[] = [
  {
    id: ids.assets.apartment,
    name: "Butas Žirmūnuose, 3 kambariai, 68 m²",
    type: "property",
    currentValue: "145000.00",
    asOf: "2026-06-30",
  },
  {
    id: ids.assets.car,
    name: "Toyota Corolla 2021",
    type: "vehicle",
    currentValue: "14500.00",
    asOf: "2026-08-15",
  },
  {
    id: ids.assets.investments,
    name: "III pakopos pensijų fondas ir ETF portfelis",
    type: "investment",
    currentValue: "8320.55",
    asOf: "2026-09-01",
  },
];

export const debts: DebtResponse[] = [
  {
    id: ids.debts.mortgage,
    name: "Būsto paskola (Swedbank)",
    type: "mortgage",
    outstandingAmount: "98450.32",
    interestRate: 3.85,
    asOf: "2026-09-05",
  },
  {
    id: ids.debts.carLease,
    name: "Automobilio lizingas",
    type: "loan",
    outstandingAmount: "6200.00",
    interestRate: null,
    asOf: "2026-09-01",
  },
];

const accountsCents = totalOf(accounts.map((item) => item.currentBalance));
const assetsCents = totalOf(assets.map((item) => item.currentValue));
const debtsCents = totalOf(debts.map((item) => item.outstandingAmount));

export const netWorth: NetWorthResponse = {
  accounts: fromCents(accountsCents),
  assets: fromCents(assetsCents),
  debts: fromCents(debtsCents),
  netWorth: fromCents(accountsCents + assetsCents - debtsCents),
};

export const emptyNetWorth: NetWorthResponse = {
  accounts: "0.00",
  assets: "0.00",
  debts: "0.00",
  netWorth: "0.00",
};

function snapshot(date: string, accountsValue: string, assetsValue: string, debtsValue: string) {
  const item: NetWorthSnapshotItem = {
    date,
    accounts: accountsValue,
    assets: assetsValue,
    debts: debtsValue,
    netWorth: fromCents(toCents(accountsValue) + toCents(assetsValue) - toCents(debtsValue)),
  };
  return item;
}

export const netWorthHistoryItems: NetWorthSnapshotItem[] = [
  snapshot("2025-10-01", "11240.10", "161200.00", "109980.75"),
  snapshot("2025-11-01", "11875.42", "161450.30", "109512.10"),
  snapshot("2025-12-01", "12390.05", "161900.80", "109040.66"),
  snapshot("2026-01-01", "11020.77", "162300.00", "108566.40"),
  snapshot("2026-02-01", "12110.30", "162950.45", "108089.31"),
  snapshot("2026-03-01", "13004.88", "163400.10", "107609.35"),
  snapshot("2026-04-01", "13790.15", "164800.00", "107126.52"),
  snapshot("2026-05-01", "14615.60", "165320.75", "106640.79"),
  snapshot("2026-06-01", "15230.94", "165900.20", "106152.13"),
  snapshot("2026-07-01", "14870.12", "167100.00", "105660.52"),
  snapshot("2026-08-01", "16045.33", "167480.90", "105165.94"),
  snapshot("2026-09-01", netWorth.accounts, netWorth.assets, netWorth.debts),
];

export const netWorthHistory: NetWorthHistoryResponse = { items: netWorthHistoryItems };
