import type { TrashEntryResponse, TrashKind } from "@/api/generated/model";
import { ids, uid } from "./base";

function entry(
  index: number,
  kind: TrashKind,
  entityId: string,
  description: string,
  deletedAt: string,
): TrashEntryResponse {
  return { id: uid("5c5c5c5c", index), kind, entityId, description, deletedAt };
}

export const trashEntries: TrashEntryResponse[] = [
  entry(1, "transaction", ids.transactions.maxima, "Maxima, 42.18 EUR", "2026-09-18T18:12:00Z"),
  entry(2, "budget", ids.budgets.food, "Maistas, 450.00 EUR", "2026-09-18T09:05:00Z"),
  entry(
    3,
    "transfer",
    ids.transfers.toSavings,
    "Pervedimas į santaupas, 200.00 EUR",
    "2026-09-17T20:41:00Z",
  ),
  entry(4, "goal", ids.goals.vacation, "Atostogos Ispanijoje", "2026-09-16T11:27:00Z"),
  entry(5, "recurringBill", ids.bills.telia, "Telia internetas", "2026-09-15T07:02:00Z"),
  entry(
    6,
    "conversion",
    ids.conversions.eurToUsd,
    "150.00 EUR → 162.30 USD",
    "2026-09-12T16:55:00Z",
  ),
  entry(7, "asset", ids.assets.car, "Automobilis", "2026-09-10T12:20:00Z"),
  entry(8, "debt", ids.debts.mortgage, "Būsto paskola", "2026-09-08T08:44:00Z"),
  entry(
    9,
    "investmentTransaction",
    uid("ffffffff", 6),
    "Sell 3 MSFT, 2026-07-15",
    "2026-09-06T14:18:00Z",
  ),
];

export const trashPage = {
  items: trashEntries,
  page: 1,
  pageSize: 10,
  total: trashEntries.length,
};
