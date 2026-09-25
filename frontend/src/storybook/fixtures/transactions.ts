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

const { broker, cash, checking, shared } = ids.accounts;
const {
  cafes,
  entertainment,
  food,
  gifts,
  health,
  housing,
  salary,
  shopping,
  sideIncome,
  telecom,
  transport,
  utilities,
} = ids.categories;
const { car, children, holiday, reimbursable, renovation } = ids.tags;

function transactionFrom(source: TransactionResponse["source"]) {
  return function transaction(
    n: number,
    monthDay: string,
    accountId: string,
    categoryId: string | null,
    signedAmount: number,
    description: string | null,
    tagIds: string[] = [],
    attachmentCount = 0,
  ): TransactionResponse {
    const date = `2026-${monthDay}`;
    const amount = Math.abs(signedAmount).toFixed(2);
    return {
      id: uid("55555555", n),
      accountId,
      categoryId,
      type: signedAmount < 0 ? "expense" : "income",
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
      attachmentCount,
    };
  };
}

const imported = transactionFrom("imported");
const manual = transactionFrom("manual");

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
  ...manual(
    6,
    "09-13",
    shared,
    null,
    -128.4,
    "Maxima XXX Akropolis – didysis savaitgalio apsipirkimas",
    [renovation],
  ),
  isSplit: true,
  lines: splitTransactionLines,
  attachmentCount: 2,
};

export const longDescriptionTransaction: TransactionResponse = imported(
  16,
  "09-05",
  checking,
  shopping,
  -249,
  "Senukai, Ukmergės g. 369, Vilnius – sodo baldų komplektas su pagalvėlėmis, pristatymas į namus, surinkimo paslauga ir pratęsta dvejų metų garantija (užsakymo Nr. LT-2026-0905-778812)",
  [renovation, reimbursable],
);

export const uncategorisedTransaction: TransactionResponse = manual(
  21,
  "09-01",
  cash,
  null,
  -50,
  null,
);

export const foreignCurrencyTransactions: TransactionResponse[] = [
  {
    ...manual(801, "09-15", broker, null, 42.5, "VUSA dividendai"),
    currency: "usd",
    reportingAmount: "39.20",
  },
  manual(802, "09-08", broker, null, -2, "Conversion fee EUR to USD"),
  {
    ...manual(803, "08-22", broker, null, -1250, "London hotel"),
    currency: "gbp",
    reportingAmount: "1485.09",
  },
];

export const transactions: TransactionResponse[] = [
  imported(1, "09-17", shared, food, -42.18, "Maxima X, Ukmergės g.", [], 1),
  imported(2, "09-16", checking, transport, -7.4, "Bolt pavėžėjimas", [car]),
  imported(3, "09-15", shared, utilities, -68.93, "Ignitis – elektra už rugpjūtį"),
  imported(4, "09-15", checking, telecom, -24.99, "Telia – mobilusis ryšys ir internetas"),
  imported(5, "09-14", shared, food, -56.72, "Lidl Žirmūnai"),
  splitTransaction,
  manual(7, "09-12", cash, cafes, -4.8, "Caffeine – kava išsinešti"),
  imported(8, "09-11", checking, entertainment, -18, "Forum Cinemas Vingis", [holiday, children]),
  imported(9, "09-10", checking, salary, 2850, "UAB „Baltijos sprendimai“ – darbo užmokestis"),
  manual(10, "09-10", shared, salary, 2140, "Šarūno atlyginimas"),
  imported(11, "09-09", checking, transport, -61.35, "Circle K – degalai", [car]),
  imported(12, "09-08", checking, health, -23.47, "Eurovaistinė", [reimbursable]),
  imported(13, "09-07", shared, food, -31.06, "Rimi Hyper"),
  imported(14, "09-06", shared, utilities, -19.84, "Vilniaus vandenys"),
  imported(15, "09-05", shared, housing, -612, "Būsto paskolos įmoka"),
  longDescriptionTransaction,
  imported(17, "09-04", checking, cafes, -16.9, "Wolt – Jurgis ir Drakonas"),
  manual(18, "09-03", checking, sideIncome, 420, "Vertimų projektas – sąskaita RK-0027"),
  imported(19, "09-02", shared, utilities, -12.38, "Vilniaus šilumos tinklai"),
  imported(20, "09-01", checking, entertainment, -10.99, "Spotify Premium"),
  uncategorisedTransaction,
  imported(22, "08-30", shared, food, -27.63, "IKI Antakalnis"),
  manual(23, "08-28", cash, gifts, 100, "Gimtadienio dovana nuo močiutės"),
  imported(24, "08-25", checking, shopping, -89.95, "Zara, Akropolis", [children]),
  manual(25, "08-20", checking, transport, -29, "Trafi – mėnesinis viešojo transporto bilietas"),
  imported(26, "08-10", checking, salary, 2850, "UAB „Baltijos sprendimai“ – darbo užmokestis"),
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
