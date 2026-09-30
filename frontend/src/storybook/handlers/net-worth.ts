import type { AssetValuationResponse, AssetValueHistoryResponse } from "@/api/generated/model";
import {
  getAssetValuationsMockHandler,
  getAssetValueHistoryMockHandler,
  getCreateAssetMockHandler,
  getCreateDebtMockHandler,
  getDebtPaymentCandidatesMockHandler,
  getDebtPaymentsMockHandler,
  getDebtScheduleMockHandler,
  getDeleteAssetMockHandler,
  getDeleteAssetValuationMockHandler,
  getDeleteDebtMockHandler,
  getAssetsMockHandler,
  getDebtsMockHandler,
  getLinkDebtPaymentMockHandler,
  getNetWorthHistoryMockHandler,
  getNetWorthMockHandler,
  getSetAssetValuationMockHandler,
  getUnlinkDebtPaymentMockHandler,
  getUpdateAssetMockHandler,
  getUpdateDebtMockHandler,
  getUpdateDebtPaymentMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import {
  FIXTURE_TODAY,
  apartmentValuations,
  apartmentValueHistory,
  assets,
  buildDebtSchedule,
  carValuations,
  carValueHistory,
  debts,
  dollarAsset,
  fullyDepreciatedAsset,
  ids,
  linearDebt,
  mortgagePayments,
  netWorth,
  netWorthHistory,
  scheduleIncompleteProblem,
  trackedMortgage,
  transactions,
  zeroRateDebt,
} from "@/storybook/fixtures";
import { found, problem, query, readBody } from "./http";
import { NEW_ID } from "./ids";
import { byId, updateFrom } from "./lists";

const scheduledDebts = [...debts, zeroRateDebt, linearDebt];

const knownAssets = [...assets, fullyDepreciatedAsset, dollarAsset];

const valuationsByAsset: Record<string, AssetValuationResponse[]> = {
  [ids.assets.apartment]: apartmentValuations,
  [ids.assets.car]: carValuations,
};

const historyByAsset: Record<string, AssetValueHistoryResponse> = {
  [ids.assets.apartment]: apartmentValueHistory,
  [ids.assets.car]: carValueHistory,
};

export const assetHandlers = [
  getAssetsMockHandler(assets),
  getCreateAssetMockHandler(async ({ request }) => ({
    id: NEW_ID,
    name: "",
    type: "other",
    currentValue: "0.00",
    asOf: FIXTURE_TODAY,
    currency: "eur",
    value: "0.00",
    depreciation: null,
    monthlyDepreciation: null,
    fullyDepreciatedOn: null,
    scope: "personal" as const,
    householdId: null,
    ...(await readBody(request)),
  })),
  getUpdateAssetMockHandler(updateFrom(knownAssets)),
  getDeleteAssetMockHandler(),
  getAssetValuationsMockHandler(({ params }) => {
    const asset = found(byId(knownAssets, params.id));
    return (
      valuationsByAsset[asset.id] ?? [{ date: asset.asOf, value: asset.currentValue, note: null }]
    );
  }),
  getAssetValueHistoryMockHandler(({ params }) => {
    const asset = found(byId(knownAssets, params.id));
    return (
      historyByAsset[asset.id] ?? {
        currency: asset.currency,
        points: [
          { date: asset.asOf, value: asset.currentValue, isValuation: true },
          { date: FIXTURE_TODAY, value: asset.value, isValuation: false },
        ],
      }
    );
  }),
  getSetAssetValuationMockHandler(({ params }) => found(byId(knownAssets, params.id))),
  getDeleteAssetValuationMockHandler(),
];

const debtScheduleHandler = getDebtScheduleMockHandler(({ params, request }) => {
  const debt = found(byId(scheduledDebts, params.id));
  if (debt.payoffDate === null) {
    throw problem(scheduleIncompleteProblem);
  }
  const search = query(request);
  return buildDebtSchedule(debt, {
    extraMonthly: search.get("extraMonthly"),
    lumpSum: search.get("lumpSum"),
    lumpSumDate: search.get("lumpSumDate"),
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
    tracksPayments: false,
    trackedBalance: null,
    trackedIncomplete: false,
    unavailablePayments: 0,
    scope: "personal" as const,
    householdId: null,
    ...(await readBody(request)),
  })),
  getUpdateDebtMockHandler(updateFrom(scheduledDebts)),
  getDeleteDebtMockHandler(),
  getDebtPaymentsMockHandler(({ params }) =>
    params.id === trackedMortgage.id ? mortgagePayments : [],
  ),
  getDebtPaymentCandidatesMockHandler(
    transactions.filter((item) => item.type === "expense" && !item.isSplit).slice(0, 5),
  ),
  getLinkDebtPaymentMockHandler(trackedMortgage),
  getUpdateDebtPaymentMockHandler(trackedMortgage),
  getUnlinkDebtPaymentMockHandler(),
];

export const netWorthHandlers = [
  getNetWorthMockHandler(netWorth),
  getNetWorthHistoryMockHandler(netWorthHistory),
];
