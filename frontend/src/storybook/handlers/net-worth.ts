import {
  getCreateAssetMockHandler,
  getCreateDebtMockHandler,
  getDeleteAssetMockHandler,
  getDeleteDebtMockHandler,
  getAssetsMockHandler,
  getDebtsMockHandler,
  getNetWorthHistoryMockHandler,
  getNetWorthMockHandler,
  getUpdateAssetMockHandler,
  getUpdateDebtMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { FIXTURE_TODAY, assets, debts, netWorth, netWorthHistory } from "@/storybook/fixtures";
import { found, readBody } from "./http";
import { NEW_ID } from "./ids";
import { byId } from "./lists";

export const assetHandlers = [
  getAssetsMockHandler(assets),
  getCreateAssetMockHandler(async ({ request }) => ({
    id: NEW_ID,
    name: "",
    type: "other",
    currentValue: "0.00",
    asOf: FIXTURE_TODAY,
    ...(await readBody(request)),
  })),
  getUpdateAssetMockHandler(async ({ params, request }) => ({
    ...found(byId(assets, params.id)),
    ...(await readBody(request)),
  })),
  getDeleteAssetMockHandler(),
];

export const debtHandlers = [
  getDebtsMockHandler(debts),
  getCreateDebtMockHandler(async ({ request }) => ({
    id: NEW_ID,
    name: "",
    type: "other",
    outstandingAmount: "0.00",
    interestRate: null,
    asOf: FIXTURE_TODAY,
    ...(await readBody(request)),
  })),
  getUpdateDebtMockHandler(async ({ params, request }) => ({
    ...found(byId(debts, params.id)),
    ...(await readBody(request)),
  })),
  getDeleteDebtMockHandler(),
];

export const netWorthHandlers = [
  getNetWorthMockHandler(netWorth),
  getNetWorthHistoryMockHandler(netWorthHistory),
];
