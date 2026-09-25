import {
  getCreateAssetMockHandler,
  getCreateDebtMockHandler,
  getDebtScheduleMockHandler,
  getDeleteAssetMockHandler,
  getDeleteDebtMockHandler,
  getAssetsMockHandler,
  getDebtsMockHandler,
  getNetWorthHistoryMockHandler,
  getNetWorthMockHandler,
  getUpdateAssetMockHandler,
  getUpdateDebtMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import {
  FIXTURE_TODAY,
  assets,
  buildDebtSchedule,
  debts,
  linearDebt,
  netWorth,
  netWorthHistory,
  scheduleIncompleteProblem,
  zeroRateDebt,
} from "@/storybook/fixtures";
import { found, problem, readBody } from "./http";
import { NEW_ID } from "./ids";
import { byId } from "./lists";

const scheduledDebts = [...debts, zeroRateDebt, linearDebt];

export const assetHandlers = [
  getAssetsMockHandler(assets),
  getCreateAssetMockHandler(async ({ request }) => ({
    id: NEW_ID,
    name: "",
    type: "other",
    currentValue: "0.00",
    asOf: FIXTURE_TODAY,
    currency: "eur",
    ...(await readBody(request)),
  })),
  getUpdateAssetMockHandler(async ({ params, request }) => ({
    ...found(byId(assets, params.id)),
    ...(await readBody(request)),
  })),
  getDeleteAssetMockHandler(),
];

export const debtScheduleHandler = getDebtScheduleMockHandler(({ params, request }) => {
  const debt = found(byId(scheduledDebts, params.id));
  if (debt.payoffDate === null) {
    throw problem(scheduleIncompleteProblem);
  }
  const query = new URL(request.url).searchParams;
  return buildDebtSchedule(debt, {
    extraMonthly: query.get("extraMonthly"),
    lumpSum: query.get("lumpSum"),
    lumpSumDate: query.get("lumpSumDate"),
  });
});

export const debtHandlers = [
  getDebtsMockHandler(debts),
  debtScheduleHandler,
  getCreateDebtMockHandler(async ({ request }) => ({
    id: NEW_ID,
    name: "",
    type: "other",
    outstandingAmount: "0.00",
    interestRate: null,
    asOf: FIXTURE_TODAY,
    currency: "eur",
    loanAmount: null,
    firstPaymentDate: null,
    termMonths: null,
    monthlyPayment: null,
    amortizationType: "annuity",
    payoffDate: null,
    ...(await readBody(request)),
  })),
  getUpdateDebtMockHandler(async ({ params, request }) => ({
    ...found(byId(scheduledDebts, params.id)),
    ...(await readBody(request)),
  })),
  getDeleteDebtMockHandler(),
];

export const netWorthHandlers = [
  getNetWorthMockHandler(netWorth),
  getNetWorthHistoryMockHandler(netWorthHistory),
];
