import type {
  AmortizationType,
  AssetResponse,
  DebtResponse,
  DebtSchedulePlan,
  DebtScheduleResponse,
  DebtScheduleRow,
  NetWorthHistoryResponse,
  NetWorthResponse,
  NetWorthSnapshotItem,
} from "@/api/generated/model";
import { fromCents, toCents } from "@/lib/money";
import { accounts } from "./accounts";
import { FIXTURE_TODAY, ids, totalOf } from "./base";

export const assets: AssetResponse[] = [
  {
    id: ids.assets.apartment,
    name: "Butas Žirmūnuose, 3 kambariai, 68 m²",
    type: "property",
    currentValue: "145000.00",
    asOf: "2026-06-30",
    currency: "eur",
  },
  {
    id: ids.assets.car,
    name: "Toyota Corolla 2021",
    type: "vehicle",
    currentValue: "14500.00",
    asOf: "2026-08-15",
    currency: "eur",
  },
  {
    id: ids.assets.investments,
    name: "III pakopos pensijų fondas ir ETF portfelis",
    type: "investment",
    currentValue: "8320.55",
    asOf: "2026-09-01",
    currency: "eur",
  },
];

export interface ScheduleExtra {
  extraMonthly?: string | null;
  lumpSum?: string | null;
  lumpSumDate?: string | null;
}

type ScheduleTerms = Pick<
  DebtResponse,
  "loanAmount" | "interestRate" | "firstPaymentDate" | "termMonths" | "monthlyPayment"
> & { amortizationType: AmortizationType };

const MAX_TERM_MONTHS = 600;

function addMonths(iso: string, months: number) {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

function regularCents(principal: number, rate: number, terms: ScheduleTerms) {
  const term = terms.termMonths;
  if (term === null) {
    return toCents(terms.monthlyPayment ?? "0");
  }
  if (terms.amortizationType === "linear" || rate === 0) {
    return Math.round(principal / term);
  }
  const growth = (1 + rate) ** term;
  return Math.round((principal * rate * growth) / (growth - 1));
}

function schedulePlan(terms: ScheduleTerms, extra: ScheduleExtra = {}): DebtSchedulePlan | null {
  if (terms.loanAmount === null || terms.interestRate === null || !terms.firstPaymentDate) {
    return null;
  }
  const principal = toCents(terms.loanAmount);
  const rate = terms.interestRate / 1200;
  const regular = regularCents(principal, rate, terms);
  const monthlyExtra = toCents(extra.extraMonthly ?? "0");
  let lumpSum = toCents(extra.lumpSum ?? "0");
  const rows: DebtScheduleRow[] = [];
  let balance = principal;
  for (let number = 1; balance > 0 && number <= MAX_TERM_MONTHS; number++) {
    const date = addMonths(terms.firstPaymentDate, number - 1);
    const interest = Math.round(balance * rate);
    let principalPart = Math.max(
      0,
      terms.amortizationType === "linear" ? regular : regular - interest,
    );
    if (principalPart >= balance || number === terms.termMonths) {
      principalPart = balance;
    }
    let extraPart = monthlyExtra;
    if (lumpSum > 0 && extra.lumpSumDate && date >= extra.lumpSumDate) {
      extraPart += lumpSum;
      lumpSum = 0;
    }
    extraPart = Math.min(extraPart, balance - principalPart);
    balance -= principalPart + extraPart;
    rows.push({
      number,
      date,
      payment: fromCents(interest + principalPart),
      interest: fromCents(interest),
      principal: fromCents(principalPart),
      extra: fromCents(extraPart),
      balance: fromCents(balance),
    });
  }
  function sum(pick: (row: DebtScheduleRow) => string) {
    return fromCents(rows.reduce((total, row) => total + toCents(pick(row)), 0));
  }

  return {
    payoffDate: rows.at(-1)?.date ?? terms.firstPaymentDate,
    payments: rows.length,
    totalPaid: fromCents(
      rows.reduce((total, row) => total + toCents(row.payment) + toCents(row.extra), 0),
    ),
    totalInterest: sum((row) => row.interest),
    totalExtra: sum((row) => row.extra),
    rows,
  };
}

function withPayoff(debt: Omit<DebtResponse, "payoffDate">): DebtResponse {
  return { ...debt, payoffDate: schedulePlan(debt)?.payoffDate ?? null };
}

const noSchedule = {
  loanAmount: null,
  firstPaymentDate: null,
  termMonths: null,
  monthlyPayment: null,
  amortizationType: "annuity",
} as const;

export const debts: DebtResponse[] = [
  withPayoff({
    id: ids.debts.mortgage,
    name: "Būsto paskola (Swedbank)",
    type: "mortgage",
    outstandingAmount: "98450.32",
    interestRate: 3.85,
    asOf: "2026-09-05",
    currency: "eur",
    loanAmount: "120000.00",
    firstPaymentDate: "2021-03-15",
    termMonths: 300,
    monthlyPayment: null,
    amortizationType: "annuity",
  }),
  withPayoff({
    id: ids.debts.carLease,
    name: "Automobilio lizingas",
    type: "loan",
    outstandingAmount: "6200.00",
    interestRate: null,
    asOf: "2026-09-01",
    currency: "eur",
    ...noSchedule,
  }),
];

export const zeroRateDebt: DebtResponse = withPayoff({
  id: ids.debts.familyLoan,
  name: "Paskola iš tėvų",
  type: "other",
  outstandingAmount: "4000.00",
  interestRate: 0,
  asOf: "2026-09-01",
  currency: "eur",
  loanAmount: "6000.00",
  firstPaymentDate: "2026-01-10",
  termMonths: null,
  monthlyPayment: "250.00",
  amortizationType: "annuity",
});

export const linearDebt: DebtResponse = withPayoff({
  id: ids.debts.studentLoan,
  name: "Studijų paskola",
  type: "loan",
  outstandingAmount: "7200.00",
  interestRate: 2.1,
  asOf: "2026-09-01",
  currency: "eur",
  loanAmount: "9000.00",
  firstPaymentDate: "2025-01-20",
  termMonths: 60,
  monthlyPayment: null,
  amortizationType: "linear",
});

function found(debt: DebtResponse | undefined): DebtResponse {
  if (!debt) {
    throw new Error("the debts fixture is empty");
  }
  return debt;
}

export function buildDebtSchedule(
  debt: DebtResponse,
  extra: ScheduleExtra = {},
  asOf: string = FIXTURE_TODAY,
): DebtScheduleResponse {
  const plan = schedulePlan(debt);
  if (!plan || debt.loanAmount === null || debt.interestRate === null) {
    throw new Error(`${debt.name} has no repayment schedule`);
  }
  const hasExtra = Boolean(Number(extra.extraMonthly ?? 0) || Number(extra.lumpSum ?? 0));
  const faster = hasExtra ? schedulePlan(debt, extra) : null;
  const made = plan.rows.filter((row) => row.date <= asOf);
  return {
    debtId: debt.id,
    asOf,
    loanAmount: debt.loanAmount,
    interestRate: debt.interestRate,
    amortizationType: debt.amortizationType,
    regularPayment: plan.rows[0]?.payment ?? "0.00",
    scheduledBalance: made.at(-1)?.balance ?? debt.loanAmount,
    paymentsMade: made.length,
    plan,
    withExtra: faster,
    interestSaved: faster
      ? fromCents(toCents(plan.totalInterest) - toCents(faster.totalInterest))
      : null,
    paymentsSaved: faster ? plan.payments - faster.payments : null,
  };
}

const mortgage = found(debts[0]);

export const mortgageSchedule = buildDebtSchedule(mortgage);

export const mortgageScheduleWithExtra = buildDebtSchedule(mortgage, { extraMonthly: "150.00" });

export const zeroRateSchedule = buildDebtSchedule(zeroRateDebt);

export const linearSchedule = buildDebtSchedule(linearDebt);

const accountsCents = totalOf(accounts.map((item) => item.currentBalance));
const assetsCents = totalOf(assets.map((item) => item.currentValue));
const debtsCents = totalOf(debts.map((item) => item.outstandingAmount));

export const netWorth: NetWorthResponse = {
  accounts: fromCents(accountsCents),
  assets: fromCents(assetsCents),
  debts: fromCents(debtsCents),
  netWorth: fromCents(accountsCents + assetsCents - debtsCents),
  isComplete: true,
};

export const emptyNetWorth: NetWorthResponse = {
  accounts: "0.00",
  assets: "0.00",
  debts: "0.00",
  netWorth: "0.00",
  isComplete: true,
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
