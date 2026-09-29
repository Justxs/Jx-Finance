import type {
  AccountForecastResponse,
  AccountResponse,
  CashFlowForecastResponse,
  ForecastEntryResponse,
} from "@/api/generated/model";
import { fromCents, toCents } from "@/lib/money";
import { checkingAccount, savingsAccount, sharedAccount } from "./accounts";
import { FIXTURE_TODAY, ids } from "./base";
import { dueSoonBill, incomeBill, transferBill, variableBill } from "./recurring-bills";

const FORECAST_TO = "2026-12-17";
const MONTHS = ["2026-10", "2026-11", "2026-12"];

type EntrySeed = Pick<ForecastEntryResponse, "date" | "amount"> &
  Partial<Omit<ForecastEntryResponse, "balanceAfter">>;

function monthly(day: string, seed: Omit<EntrySeed, "date">): EntrySeed[] {
  return MONTHS.map((month) => ({ ...seed, date: `${month}-${day}` }));
}

function recurring(
  bill: { id: string; name: string; shape: ForecastEntryResponse["shape"] },
  amount: string,
): Omit<EntrySeed, "date"> {
  return { source: "recurring", billId: bill.id, name: bill.name, shape: bill.shape, amount };
}

function accountForecast(
  account: AccountResponse,
  startBalance: string,
  seeds: EntrySeed[],
  overrides: Partial<AccountForecastResponse> = {},
): AccountForecastResponse {
  let balance = toCents(startBalance);
  let lowest = { balance, date: FIXTURE_TODAY };
  const entries = seeds
    .toSorted((a, b) => a.date.localeCompare(b.date) || toCents(b.amount) - toCents(a.amount))
    .map((seed) => {
      balance += toCents(seed.amount);
      if (balance < lowest.balance) {
        lowest = { balance, date: seed.date };
      }
      return {
        source: "recurring" as const,
        billId: null,
        name: null,
        shape: null,
        estimated: false,
        overdue: false,
        ...seed,
        balanceAfter: fromCents(balance),
      };
    });

  return {
    accountId: account.id,
    accountName: account.name,
    currency: account.currency,
    startBalance,
    usualDailySpending: null,
    lowestBalance: fromCents(lowest.balance),
    lowestOn: lowest.date,
    belowZeroOn: null,
    belowZeroWithSpendingOn: null,
    otherCurrencies: false,
    entries,
    ...overrides,
  };
}

const rent = { id: ids.bills.mortgage, name: "Buto nuoma", shape: "expense" as const };

const checkingEntries: EntrySeed[] = [
  { ...recurring(dueSoonBill, "-24.99"), date: FIXTURE_TODAY, overdue: true },
  { ...recurring(variableBill, "-61.20"), date: "2026-09-25", estimated: true },
  { source: "ledger", date: "2026-09-28", amount: "-45.00" },
  ...monthly("01", recurring(rent, "-650.00")),
  ...monthly("10", recurring(incomeBill, "2180.00")),
  ...monthly("12", recurring(transferBill, "-250.00")),
  ...["2026-10-25", "2026-11-25"].map((date) => ({
    ...recurring(variableBill, "-61.20"),
    date,
    estimated: true,
  })),
];

export const atRiskAccountForecast = accountForecast(checkingAccount, "420.00", checkingEntries, {
  usualDailySpending: "18.50",
  belowZeroOn: "2026-10-01",
  belowZeroWithSpendingOn: "2026-10-01",
});

export const savingsAccountForecast = accountForecast(
  savingsAccount,
  "12500.00",
  monthly("12", recurring(transferBill, "250.00")),
);

export const usualSpendingAccountForecast = accountForecast(
  sharedAccount,
  "900.00",
  [
    ...monthly("01", recurring(rent, "-650.00")),
    ...monthly("10", recurring(incomeBill, "1400.00")),
  ],
  { usualDailySpending: "30.00", belowZeroWithSpendingOn: "2026-10-01" },
);

export const calmAccountForecast = accountForecast(
  checkingAccount,
  "2843.17",
  [
    ...monthly("01", recurring(rent, "-650.00")),
    ...monthly("10", recurring(incomeBill, "2180.00")),
  ],
  { usualDailySpending: "18.50" },
);

export const cashFlowForecast: CashFlowForecastResponse = {
  from: FIXTURE_TODAY,
  to: FORECAST_TO,
  accounts: [atRiskAccountForecast, savingsAccountForecast],
  notCounted: [
    { billId: ids.bills.water, name: "Vilniaus vandenys", reason: "noHistory" },
    { billId: ids.bills.insurance, name: "Automobilio draudimas", reason: "noAccount" },
  ],
};

export const usualSpendingCashFlowForecast: CashFlowForecastResponse = {
  ...cashFlowForecast,
  accounts: [usualSpendingAccountForecast, savingsAccountForecast],
  notCounted: [],
};

export const calmCashFlowForecast: CashFlowForecastResponse = {
  ...cashFlowForecast,
  accounts: [calmAccountForecast, savingsAccountForecast],
  notCounted: [],
};

export const otherCurrenciesCashFlowForecast: CashFlowForecastResponse = {
  ...calmCashFlowForecast,
  accounts: [{ ...calmAccountForecast, otherCurrencies: true }],
};

export const emptyCashFlowForecast: CashFlowForecastResponse = {
  from: FIXTURE_TODAY,
  to: FORECAST_TO,
  accounts: [],
  notCounted: [],
};
