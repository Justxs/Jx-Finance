import type {
  TagBreakdownItem,
  TransactionLineResponse,
  TransactionResponse,
  TransactionsSummaryResponse,
} from "@/api/generated/model";
import { fromCents, toCents } from "@/lib/money";
import { accounts } from "./accounts";
import { FIXTURE_MONTH_END, FIXTURE_MONTH_START, ids, uid } from "./base";
import { categories } from "./categories";
import { tags } from "./tags";

function transaction(
  n: number,
  date: string,
  accountId: string,
  categoryId: string | null,
  type: TransactionResponse["type"],
  amount: string,
  description: string | null,
  source: TransactionResponse["source"],
  tagIds: string[] = [],
): TransactionResponse {
  return {
    id: uid("55555555", n),
    accountId,
    categoryId,
    type,
    amount,
    currency: "eur",
    reportingAmount: amount,
    date,
    description,
    source,
    isSplit: false,
    createdAt: `${date}T${String(8 + (n % 12)).padStart(2, "0")}:30:00Z`,
    lines: null,
    tagIds,
  };
}

export const splitTransactionLines: TransactionLineResponse[] = [
  {
    id: uid("55555556", 1),
    categoryId: ids.categories.food,
    amount: "74.15",
    description: "Savaitės maisto produktai",
  },
  {
    id: uid("55555556", 2),
    categoryId: ids.categories.householdGoods,
    amount: "39.26",
    description: "Skalbimo priemonės ir lemputės",
  },
  {
    id: uid("55555556", 3),
    categoryId: null,
    amount: "14.99",
    description: null,
  },
];

export const splitTransaction: TransactionResponse = {
  ...transaction(
    6,
    "2026-09-13",
    ids.accounts.shared,
    null,
    "expense",
    "128.40",
    "Maxima XXX Akropolis – didysis savaitgalio apsipirkimas",
    "manual",
    [ids.tags.renovation],
  ),
  isSplit: true,
  lines: splitTransactionLines,
};

export const longDescriptionTransaction: TransactionResponse = transaction(
  16,
  "2026-09-05",
  ids.accounts.checking,
  ids.categories.shopping,
  "expense",
  "249.00",
  "Senukai, Ukmergės g. 369, Vilnius – sodo baldų komplektas su pagalvėlėmis, pristatymas į namus, surinkimo paslauga ir pratęsta dvejų metų garantija (užsakymo Nr. LT-2026-0905-778812)",
  "imported",
  [ids.tags.renovation, ids.tags.reimbursable],
);

export const uncategorisedTransaction: TransactionResponse = transaction(
  21,
  "2026-09-01",
  ids.accounts.cash,
  null,
  "expense",
  "50.00",
  null,
  "manual",
);

export const foreignCurrencyTransactions: TransactionResponse[] = [
  {
    ...transaction(
      801,
      "2026-09-15",
      ids.accounts.broker,
      null,
      "income",
      "42.50",
      "VUSA dividendai",
      "manual",
    ),
    currency: "usd",
    reportingAmount: "39.20",
  },
  {
    ...transaction(
      802,
      "2026-09-08",
      ids.accounts.broker,
      null,
      "expense",
      "2.00",
      "Conversion fee EUR to USD",
      "manual",
    ),
  },
  {
    ...transaction(
      803,
      "2026-08-22",
      ids.accounts.broker,
      null,
      "expense",
      "1250.00",
      "London hotel",
      "manual",
    ),
    currency: "gbp",
    reportingAmount: "1485.09",
  },
];

export const transactions: TransactionResponse[] = [
  transaction(
    1,
    "2026-09-17",
    ids.accounts.shared,
    ids.categories.food,
    "expense",
    "42.18",
    "Maxima X, Ukmergės g.",
    "imported",
  ),
  transaction(
    2,
    "2026-09-16",
    ids.accounts.checking,
    ids.categories.transport,
    "expense",
    "7.40",
    "Bolt pavėžėjimas",
    "imported",
    [ids.tags.car],
  ),
  transaction(
    3,
    "2026-09-15",
    ids.accounts.shared,
    ids.categories.utilities,
    "expense",
    "68.93",
    "Ignitis – elektra už rugpjūtį",
    "imported",
  ),
  transaction(
    4,
    "2026-09-15",
    ids.accounts.checking,
    ids.categories.telecom,
    "expense",
    "24.99",
    "Telia – mobilusis ryšys ir internetas",
    "imported",
  ),
  transaction(
    5,
    "2026-09-14",
    ids.accounts.shared,
    ids.categories.food,
    "expense",
    "56.72",
    "Lidl Žirmūnai",
    "imported",
  ),
  splitTransaction,
  transaction(
    7,
    "2026-09-12",
    ids.accounts.cash,
    ids.categories.cafes,
    "expense",
    "4.80",
    "Caffeine – kava išsinešti",
    "manual",
  ),
  transaction(
    8,
    "2026-09-11",
    ids.accounts.checking,
    ids.categories.entertainment,
    "expense",
    "18.00",
    "Forum Cinemas Vingis",
    "imported",
    [ids.tags.holiday, ids.tags.children],
  ),
  transaction(
    9,
    "2026-09-10",
    ids.accounts.checking,
    ids.categories.salary,
    "income",
    "2850.00",
    "UAB „Baltijos sprendimai“ – darbo užmokestis",
    "imported",
  ),
  transaction(
    10,
    "2026-09-10",
    ids.accounts.shared,
    ids.categories.salary,
    "income",
    "2140.00",
    "Šarūno atlyginimas",
    "manual",
  ),
  transaction(
    11,
    "2026-09-09",
    ids.accounts.checking,
    ids.categories.transport,
    "expense",
    "61.35",
    "Circle K – degalai",
    "imported",
    [ids.tags.car],
  ),
  transaction(
    12,
    "2026-09-08",
    ids.accounts.checking,
    ids.categories.health,
    "expense",
    "23.47",
    "Eurovaistinė",
    "imported",
    [ids.tags.reimbursable],
  ),
  transaction(
    13,
    "2026-09-07",
    ids.accounts.shared,
    ids.categories.food,
    "expense",
    "31.06",
    "Rimi Hyper",
    "imported",
  ),
  transaction(
    14,
    "2026-09-06",
    ids.accounts.shared,
    ids.categories.utilities,
    "expense",
    "19.84",
    "Vilniaus vandenys",
    "imported",
  ),
  transaction(
    15,
    "2026-09-05",
    ids.accounts.shared,
    ids.categories.housing,
    "expense",
    "612.00",
    "Būsto paskolos įmoka",
    "imported",
  ),
  longDescriptionTransaction,
  transaction(
    17,
    "2026-09-04",
    ids.accounts.checking,
    ids.categories.cafes,
    "expense",
    "16.90",
    "Wolt – Jurgis ir Drakonas",
    "imported",
  ),
  transaction(
    18,
    "2026-09-03",
    ids.accounts.checking,
    ids.categories.sideIncome,
    "income",
    "420.00",
    "Vertimų projektas – sąskaita RK-0027",
    "manual",
  ),
  transaction(
    19,
    "2026-09-02",
    ids.accounts.shared,
    ids.categories.utilities,
    "expense",
    "12.38",
    "Vilniaus šilumos tinklai",
    "imported",
  ),
  transaction(
    20,
    "2026-09-01",
    ids.accounts.checking,
    ids.categories.entertainment,
    "expense",
    "10.99",
    "Spotify Premium",
    "imported",
  ),
  uncategorisedTransaction,
  transaction(
    22,
    "2026-08-30",
    ids.accounts.shared,
    ids.categories.food,
    "expense",
    "27.63",
    "IKI Antakalnis",
    "imported",
  ),
  transaction(
    23,
    "2026-08-28",
    ids.accounts.cash,
    ids.categories.gifts,
    "income",
    "100.00",
    "Gimtadienio dovana nuo močiutės",
    "manual",
  ),
  transaction(
    24,
    "2026-08-25",
    ids.accounts.checking,
    ids.categories.shopping,
    "expense",
    "89.95",
    "Zara, Akropolis",
    "imported",
    [ids.tags.children],
  ),
  transaction(
    25,
    "2026-08-20",
    ids.accounts.checking,
    ids.categories.transport,
    "expense",
    "29.00",
    "Trafi – mėnesinis viešojo transporto bilietas",
    "manual",
  ),
  transaction(
    26,
    "2026-08-10",
    ids.accounts.checking,
    ids.categories.salary,
    "income",
    "2850.00",
    "UAB „Baltijos sprendimai“ – darbo užmokestis",
    "imported",
  ),
];

export function buildTransactionsSummary(
  items: TransactionResponse[],
): TransactionsSummaryResponse {
  function sumOfType(type: TransactionResponse["type"]): string {
    return fromCents(
      items
        .filter((item) => item.type === type)
        .reduce((sum, item) => sum + toCents(item.amount), 0),
    );
  }

  return {
    count: items.length,
    totalIncome: sumOfType("income"),
    totalExpense: sumOfType("expense"),
  };
}

export const emptyTransactionsSummary: TransactionsSummaryResponse = {
  count: 0,
  totalIncome: "0.00",
  totalExpense: "0.00",
};

export interface CategorisedAmount {
  categoryId: string | null;
  cents: number;
}

export function expenseParts(items: TransactionResponse[]): CategorisedAmount[] {
  return categorisedParts(items, "expense");
}

export function categorisedParts(
  items: TransactionResponse[],
  type: TransactionResponse["type"],
): CategorisedAmount[] {
  return items
    .filter((item) => item.type === type)
    .flatMap((item) =>
      item.isSplit && item.lines
        ? item.lines.map((line) => ({
            categoryId: line.categoryId,
            cents: toCents(line.amount),
          }))
        : [{ categoryId: item.categoryId, cents: toCents(item.amount) }],
    );
}

export function sumByType(items: TransactionResponse[], type: TransactionResponse["type"]): number {
  return items
    .filter((item) => item.type === type)
    .reduce((total, item) => total + toCents(item.amount), 0);
}

export function transactionsBetween(dateFrom: string, dateTo: string): TransactionResponse[] {
  return transactions.filter((item) => item.date >= dateFrom && item.date <= dateTo);
}

export const monthTransactions = transactionsBetween(FIXTURE_MONTH_START, FIXTURE_MONTH_END);
export const monthIncomeCents = sumByType(monthTransactions, "income");
export const monthExpenseCents = sumByType(monthTransactions, "expense");

export const transactionsCsv = [
  "Date,Description,Account,Category,Tags,Type,Amount,Currency",
  ...transactions.map((item) =>
    [
      item.date,
      `"${(item.description ?? "").replaceAll('"', '""')}"`,
      accounts.find((account) => account.id === item.accountId)?.name ?? "",
      categories.find((entry) => entry.id === item.categoryId)?.name ?? "",
      item.tagIds
        .map((id) => tags.find((entry) => entry.id === id)?.name ?? "")
        .filter(Boolean)
        .join("; "),
      item.type,
      item.amount,
      item.currency.toUpperCase(),
    ].join(","),
  ),
].join("\n");

export function buildTagBreakdownItems(items: TransactionResponse[]): TagBreakdownItem[] {
  const expenses = items.filter((item) => item.type === "expense");
  const byTag = new Map<string, number>();
  let untagged = 0;

  for (const item of expenses) {
    if (item.tagIds.length === 0) {
      untagged += toCents(item.amount);
      continue;
    }
    for (const tagId of item.tagIds) {
      byTag.set(tagId, (byTag.get(tagId) ?? 0) + toCents(item.amount));
    }
  }

  return [
    ...[...byTag]
      .map(([tagId, cents]) => ({
        tagId,
        tagName: tags.find((tag) => tag.id === tagId)?.name ?? "",
        amount: fromCents(cents),
      }))
      .toSorted((a, b) => Number(b.amount) - Number(a.amount)),
    { tagId: null, tagName: "Untagged", amount: fromCents(untagged) },
  ];
}
