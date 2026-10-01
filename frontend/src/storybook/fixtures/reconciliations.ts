import type {
  AccountMovementRow,
  ReconciliationPreviewResponse,
  ReconciliationResponse,
} from "@/api/generated/model";
import { many, uid } from "./base";
import { problemOf } from "./problems";

export const matchedReconciliation: ReconciliationResponse = {
  id: uid("5e5e5e5e", 1),
  date: "2026-08-31",
  balance: "2512.40",
  currency: "eur",
  source: "manual",
  ledgerBalance: "2512.40",
  difference: "0.00",
  createdAt: "2026-09-02T18:20:00Z",
};

export const differingReconciliation: ReconciliationResponse = {
  id: uid("5e5e5e5e", 2),
  date: "2026-07-31",
  balance: "2204.10",
  currency: "eur",
  source: "statement",
  ledgerBalance: "2191.80",
  difference: "12.30",
  createdAt: "2026-08-03T07:45:00Z",
};

export const reconciliations: ReconciliationResponse[] = [
  matchedReconciliation,
  differingReconciliation,
];

const reconciliationRows: AccountMovementRow[] = [
  {
    kind: "transaction",
    id: uid("5e5e5e5e", 10),
    date: "2026-09-10",
    description: "Atlyginimas",
    amount: "2450.00",
  },
  {
    kind: "transferOut",
    id: uid("5e5e5e5e", 11),
    date: "2026-09-08",
    description: null,
    amount: "-300.00",
  },
  {
    kind: "transaction",
    id: uid("5e5e5e5e", 12),
    date: "2026-09-04",
    description: "Maxima",
    amount: "-64.23",
  },
];

export const reconciliationPreview: ReconciliationPreviewResponse = {
  date: "2026-09-15",
  currency: "eur",
  ledgerBalance: "4598.17",
  previous: matchedReconciliation,
  rows: reconciliationRows,
  rowCount: reconciliationRows.length,
};

export const firstReconciliationPreview: ReconciliationPreviewResponse = {
  ...reconciliationPreview,
  previous: null,
};

export const usdReconciliationPreview: ReconciliationPreviewResponse = {
  ...firstReconciliationPreview,
  currency: "usd",
  ledgerBalance: "2710.40",
  rows: [],
  rowCount: 0,
};

export const longReconciliationPreview: ReconciliationPreviewResponse = {
  ...reconciliationPreview,
  rows: many(reconciliationRows, 100, "5e5e5e5f"),
  rowCount: 140,
};

export const reconciliationFutureDateProblem = problemOf(
  400,
  "reconciliation.futureDate",
  "The statement date cannot be in the future.",
  { name: "date" },
);
