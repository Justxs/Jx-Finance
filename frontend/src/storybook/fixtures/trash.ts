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
  entry(
    10,
    "category",
    ids.categories.food,
    "Maistas, 42 transactions, 1 budget",
    "2026-09-05T10:31:00Z",
  ),
  entry(11, "tag", ids.tags.holiday, "Atostogos, 7 transactions", "2026-09-04T19:03:00Z"),
  entry(
    12,
    "categorizationRule",
    ids.rules.groceries,
    "Maisto prekės, 2 tags",
    "2026-09-03T08:15:00Z",
  ),
  entry(
    13,
    "household",
    ids.households.garden,
    "Sodininkų bendrija, 2 accounts, 3 categories, 1 tag",
    "2026-09-02T17:48:00Z",
  ),
];

export const recordedTrashEntries = trashEntries.filter((item) =>
  ["category", "tag", "categorizationRule", "household"].includes(item.kind),
);
