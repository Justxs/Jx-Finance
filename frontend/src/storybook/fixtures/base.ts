import { toCents } from "@/lib/money";

export const FIXTURE_TODAY = "2026-09-18";
export const FIXTURE_MONTH = "2026-09";
export const FIXTURE_MONTH_START = "2026-09-01";
export const FIXTURE_MONTH_END = "2026-09-30";
export const FIXTURE_YEAR_START = "2025-10-01";

export function uid(prefix: string, n: number): string {
  return `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

export function cycle<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) {
    throw new Error("Cannot cycle through an empty fixture list.");
  }
  return item;
}

export function many<T extends { id: string }>(
  items: readonly T[],
  count: number,
  prefix = "00000000",
): T[] {
  return Array.from({ length: count }, (_, index) => ({
    ...cycle(items, index),
    id: uid(prefix, index),
  }));
}

export const ids = {
  users: {
    ruta: uid("11111111", 1),
    sarunas: uid("11111111", 2),
    zygimantas: uid("11111111", 3),
    egle: uid("11111111", 4),
  },
  households: {
    family: uid("22222222", 1),
    garden: uid("22222222", 2),
  },
  accounts: {
    checking: uid("33333333", 1),
    savings: uid("33333333", 2),
    cash: uid("33333333", 3),
    shared: uid("33333333", 4),
    broker: uid("33333333", 5),
    archived: uid("33333333", 6),
    archivedShared: uid("33333333", 7),
  },
  categories: {
    salary: uid("44444444", 1),
    sideIncome: uid("44444444", 2),
    gifts: uid("44444444", 3),
    food: uid("44444444", 4),
    transport: uid("44444444", 5),
    utilities: uid("44444444", 6),
    telecom: uid("44444444", 7),
    housing: uid("44444444", 8),
    entertainment: uid("44444444", 9),
    health: uid("44444444", 10),
    cafes: uid("44444444", 11),
    shopping: uid("44444444", 12),
    householdGoods: uid("44444444", 13),
    noIcon: uid("44444444", 14),
  },
  tags: {
    holiday: uid("4a4a4a4a", 1),
    renovation: uid("4a4a4a4a", 2),
    reimbursable: uid("4a4a4a4a", 3),
    children: uid("4a4a4a4a", 4),
    car: uid("4a4a4a4a", 5),
  },
  rules: {
    groceries: uid("4b4b4b4b", 1),
    transport: uid("4b4b4b4b", 2),
    utilities: uid("4b4b4b4b", 3),
    salary: uid("4b4b4b4b", 4),
    holidayCard: uid("4b4b4b4b", 5),
  },
  transactions: {
    maxima: uid("55555555", 1),
    split: uid("55555555", 6),
    salary: uid("55555555", 9),
    longDescription: uid("55555555", 16),
    uncategorised: uid("55555555", 21),
  },
  transfers: {
    toSavings: uid("66666666", 1),
    toShared: uid("66666666", 2),
    cashWithdrawal: uid("66666666", 3),
    toBroker: uid("66666666", 4),
  },
  conversions: {
    eurToUsd: uid("67676767", 1),
    usdToGbp: uid("67676767", 2),
    imported: uid("67676767", 3),
  },
  budgets: {
    food: uid("77777777", 1),
    transport: uid("77777777", 2),
    entertainment: uid("77777777", 3),
    utilities: uid("77777777", 4),
  },
  goals: {
    vacation: uid("88888888", 1),
    emergencyFund: uid("88888888", 2),
    bicycle: uid("88888888", 3),
    houseDeposit: uid("88888888", 4),
    carReplacement: uid("88888888", 5),
    holidayHome: uid("88888888", 6),
  },
  bills: {
    telia: uid("99999999", 1),
    ignitis: uid("99999999", 2),
    mortgage: uid("99999999", 3),
    insurance: uid("99999999", 4),
    netflix: uid("99999999", 5),
    water: uid("99999999", 6),
    salary: uid("99999999", 7),
    savingsOrder: uid("99999999", 8),
    brokerTopUp: uid("99999999", 9),
  },
  notifications: {
    telia: uid("aaaaaaaa", 1),
    water: uid("aaaaaaaa", 2),
    ignitis: uid("aaaaaaaa", 3),
    mortgage: uid("aaaaaaaa", 4),
    foodWarning: uid("aaaaaaaa", 5),
    transportExceeded: uid("aaaaaaaa", 6),
    salary: uid("aaaaaaaa", 7),
    savingsOrder: uid("aaaaaaaa", 8),
  },
  assets: {
    apartment: uid("bbbbbbbb", 1),
    car: uid("bbbbbbbb", 2),
    investments: uid("bbbbbbbb", 3),
  },
  debts: {
    mortgage: uid("cccccccc", 1),
    carLease: uid("cccccccc", 2),
  },
} as const;

export function totalOf(amounts: string[]): number {
  return amounts.reduce((total, amount) => total + toCents(amount), 0);
}
