import type {
  CategorySuggestionResponse,
  GroupMembersResponse,
  LedgerItemResponse,
  PayeeBreakdownItem,
  PlaceBreakdownItem,
  PlaceSuggestionResponse,
  TagBreakdownItem,
  TransactionGroupResponse,
  TransactionGroupSummary,
  TransactionLineResponse,
  TransactionResponse,
  TransactionsSummaryResponse,
  UncategorizedSuggestionResponse,
  UnusualAmountResponse,
} from "@/api/generated/model";
import { fromCents, toCents } from "@/lib/money";
import { spreadSlices } from "@/lib/spread-slices";
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
      unusual: null,
      unusualDismissed: false,
      enteredByMe: true,
    };
  };
}

const imported = transactionFrom("imported");
const manual = transactionFrom("manual");

const maximaPlace: PlaceSuggestionResponse = {
  name: "Maxima X, Ukmergės g. 282, Vilnius",
  count: 14,
  latitude: 54.72381,
  longitude: 25.23612,
  nearby: false,
};

const lidlPlace: PlaceSuggestionResponse = {
  name: "Lidl Žirmūnai, Žirmūnų g. 64, Vilnius",
  count: 9,
  latitude: 54.71293,
  longitude: 25.30118,
  nearby: false,
};

const rimiPlace: PlaceSuggestionResponse = {
  name: "Rimi Hyper, Ozo g. 25, Vilnius",
  count: 6,
  latitude: 54.71612,
  longitude: 25.27794,
  nearby: false,
};

const caffeinePlace: PlaceSuggestionResponse = {
  name: "Caffeine, Gedimino pr. 9, Vilnius",
  count: 4,
  latitude: null,
  longitude: null,
  nearby: false,
};

const ikiPlace: PlaceSuggestionResponse = {
  name: "IKI Antakalnis, Antakalnio g. 40, Vilnius",
  count: 3,
  latitude: 54.70281,
  longitude: 25.31907,
  nearby: false,
};

export const placeSuggestions: PlaceSuggestionResponse[] = [
  maximaPlace,
  lidlPlace,
  rimiPlace,
  caffeinePlace,
  ikiPlace,
];

export const nearbyPlaceSuggestions: PlaceSuggestionResponse[] = [
  { ...rimiPlace, nearby: true },
  maximaPlace,
  lidlPlace,
  caffeinePlace,
  ikiPlace,
];

export const ownPlaces: PlaceSuggestionResponse[] = [
  caffeinePlace,
  ikiPlace,
  lidlPlace,
  maximaPlace,
  { name: "Maxima Ukmerges", count: 2, latitude: null, longitude: null, nearby: false },
  {
    name: "Maxima X Ukmergės g.",
    count: 1,
    latitude: 54.72379,
    longitude: 25.23615,
    nearby: false,
  },
  rimiPlace,
];

function placed(
  transaction: TransactionResponse,
  suggestion: PlaceSuggestionResponse,
): TransactionResponse {
  return {
    ...transaction,
    place: suggestion.name,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
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

export const payeeUnusual: UnusualAmountResponse = {
  basis: "payee",
  typicalAmount: "42.00",
  factor: 3.1,
  sampleSize: 6,
};

export const categoryUnusual: UnusualAmountResponse = {
  basis: "category",
  typicalAmount: "61.90",
  factor: 4,
  sampleSize: 14,
};

export const longDescriptionTransaction: TransactionResponse = {
  ...imported(
    16,
    "09-05",
    checking,
    shopping,
    -249,
    "Senukai, Ukmergės g. 369, Vilnius – sodo baldų komplektas su pagalvėlėmis, pristatymas į namus, surinkimo paslauga ir pratęsta dvejų metų garantija (užsakymo Nr. LT-2026-0905-778812)",
    [renovation, reimbursable],
  ),
  unusual: categoryUnusual,
};

export const uncategorisedTransaction: TransactionResponse = manual(
  21,
  "09-01",
  cash,
  null,
  -50,
  null,
);

export const refundedPurchase: TransactionResponse = {
  ...imported(27, "09-03", checking, shopping, -89.95, "Zara, Akropolis", [children]),
  refundedAmount: "29.95",
};

export const linkedRefund: TransactionResponse = {
  ...manual(28, "09-09", checking, shopping, -29.95, "Zara, Akropolis – grąžinta striukė", [
    children,
  ]),
  amount: "-29.95",
  reportingAmount: "-29.95",
  refundOf: {
    id: refundedPurchase.id,
    date: refundedPurchase.date,
    description: refundedPurchase.description,
  },
};

export const unlinkedRefund: TransactionResponse = {
  ...imported(29, "09-11", checking, telecom, -5, "Telia – kompensacija už sutrikimą"),
  amount: "-5.00",
  reportingAmount: "-5.00",
};

const SPREAD_MONTHS = 12;

export const spreadTransaction: TransactionResponse = {
  ...manual(30, "01-15", checking, transport, -360, "Gjensidige – KASKO draudimas", [car]),
  spreadMonths: SPREAD_MONTHS,
  spreadDirection: "forward",
  spreadFrom: "2026-01-15",
  spreadUntil: "2026-12-15",
};

export const receiptItemTransaction: TransactionResponse = {
  ...manual(32, "09-12", checking, shopping, -349, "SENUKAI", [], 1),
  receiptItem: { name: "DYSON V8 dulkių siurblys", warrantyUntil: "2028-09-12" },
};

export const refundTransactions: TransactionResponse[] = [
  unlinkedRefund,
  linkedRefund,
  refundedPurchase,
];

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

const boltRide = imported(2, "09-16", checking, transport, -7.4, "Bolt pavėžėjimas", [car]);

export const possibleDuplicatePair: TransactionResponse[] = [
  boltRide,
  manual(31, "09-15", checking, transport, -7.4, "Bolt pavėžėjimas"),
];

export const transactions: TransactionResponse[] = [
  {
    ...placed(
      imported(1, "09-17", shared, food, -42.18, "Maxima X, Ukmergės g.", [], 1),
      maximaPlace,
    ),
    payeeName: "Maxima",
  },
  boltRide,
  imported(3, "09-15", shared, utilities, -68.93, "Ignitis – elektra už rugpjūtį"),
  imported(4, "09-15", checking, telecom, -24.99, "Telia – mobilusis ryšys ir internetas"),
  placed(imported(5, "09-14", shared, food, -56.72, "Lidl Žirmūnai"), lidlPlace),
  splitTransaction,
  placed(manual(7, "09-12", cash, cafes, -4.8, "Caffeine – kava išsinešti"), caffeinePlace),
  {
    ...imported(8, "09-11", checking, entertainment, -18, "Forum Cinemas Vingis", [
      holiday,
      children,
    ]),
    note: "Filmas su vaikais per atostogas",
  },
  imported(9, "09-10", checking, salary, 2850, "UAB „Baltijos sprendimai“ – darbo užmokestis"),
  manual(10, "09-10", shared, salary, 2140, "Šarūno atlyginimas"),
  imported(11, "09-09", checking, transport, -61.35, "Circle K – degalai", [car]),
  imported(12, "09-08", checking, health, -23.47, "Eurovaistinė", [reimbursable]),
  placed(imported(13, "09-07", shared, food, -31.06, "Rimi Hyper"), rimiPlace),
  imported(14, "09-06", shared, utilities, -19.84, "Vilniaus vandenys"),
  imported(15, "09-05", shared, housing, -612, "Būsto paskolos įmoka"),
  longDescriptionTransaction,
  imported(17, "09-04", checking, cafes, -16.9, "Wolt – Jurgis ir Drakonas"),
  manual(18, "09-03", checking, sideIncome, 420, "Vertimų projektas – sąskaita RK-0027"),
  imported(19, "09-02", shared, utilities, -12.38, "Vilniaus šilumos tinklai"),
  imported(20, "09-01", checking, entertainment, -10.99, "Spotify Premium"),
  uncategorisedTransaction,
  placed(imported(22, "08-30", shared, food, -27.63, "IKI Antakalnis"), ikiPlace),
  manual(23, "08-28", cash, gifts, 100, "Gimtadienio dovana nuo močiutės"),
  imported(24, "08-25", checking, shopping, -89.95, "Zara, Akropolis", [children]),
  manual(25, "08-20", checking, transport, -29, "Trafi – mėnesinis viešojo transporto bilietas"),
  imported(26, "08-10", checking, salary, 2850, "UAB „Baltijos sprendimai“ – darbo užmokestis"),
];

export const categorySuggestionByRule: CategorySuggestionResponse = {
  categoryId: food,
  source: "rule",
  ruleName: "Maxima",
  confidence: null,
};

export const categorySuggestionLearned: CategorySuggestionResponse = {
  categoryId: food,
  source: "learned",
  ruleName: null,
  confidence: 0.93,
};

export const noCategorySuggestion: CategorySuggestionResponse = {
  categoryId: null,
  source: null,
  ruleName: null,
  confidence: null,
};

export const uncategorizedSuggestions: UncategorizedSuggestionResponse[] = [
  {
    transaction: imported(41, "09-16", checking, null, -12.4, "MAXIMA LT 0412 VILNIUS"),
    categoryId: food,
    source: "learned",
    ruleName: null,
    confidence: 0.93,
  },
  {
    transaction: imported(42, "09-12", checking, null, -8.15, "MAXIMA LT 0388 VILNIUS"),
    categoryId: food,
    source: "learned",
    ruleName: null,
    confidence: 0.88,
  },
  {
    transaction: imported(43, "09-09", checking, null, -14.5, "Bolt Food – Pizza Jazz"),
    categoryId: cafes,
    source: "rule",
    ruleName: "Bolt Food",
    confidence: null,
  },
];

const tripGroupId = uid("57575757", 1);
const kitchenGroupId = uid("57575757", 2);

function grouped(transaction: TransactionResponse): TransactionResponse {
  return { ...transaction, groupId: tripGroupId };
}

export const tripGroupMembers: TransactionResponse[] = [
  grouped(imported(901, "09-14", checking, entertainment, -180, "Hotel Bergs, Ryga", [holiday])),
  grouped(imported(902, "09-13", checking, cafes, -58, "Restoranas Vincents, Ryga", [holiday])),
  grouped(imported(903, "09-12", checking, transport, -62.4, "Circle K Ryga – degalai", [holiday])),
];

export const tripGroup: TransactionGroupSummary = {
  id: tripGroupId,
  name: "Kelionė į Rygą",
  firstDate: "2026-09-12",
  lastDate: "2026-09-14",
  memberCount: 3,
  matchingCount: 3,
  netReportingAmount: "-300.40",
};

export const partlyMatchingTripGroup: TransactionGroupSummary = {
  ...tripGroup,
  firstDate: "2026-09-12",
  lastDate: "2026-09-12",
  matchingCount: 1,
  netReportingAmount: "-62.40",
};

export const tripGroupMembersResponse: GroupMembersResponse = {
  items: tripGroupMembers,
  truncated: false,
};

export const transactionGroups: TransactionGroupResponse[] = [
  {
    id: tripGroupId,
    name: tripGroup.name,
    memberCount: tripGroup.memberCount,
    firstDate: tripGroup.firstDate,
    lastDate: tripGroup.lastDate,
  },
  {
    id: kitchenGroupId,
    name: "Virtuvės remontas",
    memberCount: 6,
    firstDate: "2026-07-02",
    lastDate: "2026-08-27",
  },
];

export function ledgerItemsOf(
  rows: readonly TransactionResponse[],
  groups: readonly TransactionGroupSummary[] = [],
): LedgerItemResponse[] {
  const items = rows.map((transaction): LedgerItemResponse => ({
    kind: "transaction",
    transaction,
    group: null,
  }));
  for (const group of groups) {
    const at = items.findIndex((item) => (item.transaction?.date ?? "") < group.lastDate);
    items.splice(at === -1 ? items.length : at, 0, { kind: "group", transaction: null, group });
  }
  return items;
}

export const ledgerItems: LedgerItemResponse[] = ledgerItemsOf(transactions, [tripGroup]);

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

export function countedBetween(dateFrom: string, dateTo: string): TransactionResponse[] {
  const slices = spreadSlices(
    spreadTransaction.date,
    spreadTransaction.reportingAmount,
    SPREAD_MONTHS,
  )
    .filter((slice) => slice.date >= dateFrom && slice.date <= dateTo)
    .map((slice) => ({
      ...spreadTransaction,
      date: slice.date,
      amount: fromCents(slice.cents),
      reportingAmount: fromCents(slice.cents),
    }));
  return [...transactionsBetween(dateFrom, dateTo), ...slices];
}

export const monthTransactions = transactionsBetween(FIXTURE_MONTH_START, FIXTURE_MONTH_END);
const monthCounted = countedBetween(FIXTURE_MONTH_START, FIXTURE_MONTH_END);
export const monthIncomeCents = sumByType(monthCounted, "income");
export const monthExpenseCents = sumByType(monthCounted, "expense");

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

function payeeKeyOf(description: string | null): string {
  return (description ?? "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token !== "" && !/^\d+$/.test(token) && token.replace(/\D/g, "").length < 3)
    .join(" ");
}

export function buildPlaceBreakdownItems(items: TransactionResponse[]): PlaceBreakdownItem[] {
  const byPlace = new Map<string, PlaceBreakdownItem>();
  for (const item of items.filter((entry) => entry.type === "expense")) {
    const key = item.place?.toLowerCase() ?? "";
    const entry = byPlace.get(key);
    byPlace.set(key, {
      place: item.place ?? null,
      amount: fromCents(toCents(entry?.amount ?? "0.00") + toCents(item.reportingAmount)),
      comparisonAmount: null,
      count: (entry?.count ?? 0) + 1,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
    });
  }

  return [...byPlace.values()].toSorted((a, b) => Number(b.amount) - Number(a.amount));
}

export function buildPayeeBreakdownItems(items: TransactionResponse[]): PayeeBreakdownItem[] {
  const byKey = new Map<string, PayeeBreakdownItem>();
  const newestFirst = items
    .filter((item) => item.type === "expense")
    .toSorted((a, b) => b.date.localeCompare(a.date));

  for (const item of newestFirst) {
    const key = payeeKeyOf(item.description);
    const entry = byKey.get(key);
    byKey.set(key, {
      payeeKey: key || null,
      label: key ? (entry?.label ?? item.description) : null,
      amount: fromCents(toCents(entry?.amount ?? "0.00") + toCents(item.reportingAmount)),
      comparisonAmount: null,
      count: (entry?.count ?? 0) + 1,
    });
  }

  return [...byKey.values()].toSorted((a, b) => Number(b.amount) - Number(a.amount));
}
