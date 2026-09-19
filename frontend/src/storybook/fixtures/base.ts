export const FIXTURE_TODAY = "2026-09-18";
export const FIXTURE_MONTH = "2026-09";
export const FIXTURE_MONTH_START = "2026-09-01";
export const FIXTURE_MONTH_END = "2026-09-30";
export const FIXTURE_YEAR_START = "2025-10-01";

export function uid(prefix: string, n: number): string {
  return `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

export function toCents(amount: string): number {
  return Math.round(Number(amount) * 100);
}

export function cycle<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) {
    throw new Error("Cannot cycle through an empty fixture list.");
  }
  return item;
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
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
  },
  bills: {
    telia: uid("99999999", 1),
    ignitis: uid("99999999", 2),
    mortgage: uid("99999999", 3),
    insurance: uid("99999999", 4),
    netflix: uid("99999999", 5),
    water: uid("99999999", 6),
  },
  notifications: {
    telia: uid("aaaaaaaa", 1),
    water: uid("aaaaaaaa", 2),
    ignitis: uid("aaaaaaaa", 3),
    mortgage: uid("aaaaaaaa", 4),
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
