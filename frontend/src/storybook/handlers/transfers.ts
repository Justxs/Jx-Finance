import type { TransferResponse } from "@/api/generated/model";
import {
  getCreateTransferMockHandler,
  getDeleteTransferMockHandler,
  getTransfersMockHandler,
  getUpdateTransferMockHandler,
} from "@/api/generated/transfers/transfers.msw";
import { FIXTURE_TODAY, checkingAccount, transfers } from "@/storybook/fixtures";
import { query, readBody } from "./http";
import type { Body } from "./http";
import { CREATED_AT, NEW_ID } from "./ids";
import { paginate, updateFrom } from "./lists";

function mergeTransfer(base: TransferResponse, body: Body): TransferResponse {
  const merged: TransferResponse = { ...base, ...body };
  return { ...merged, receivedAmount: merged.receivedAmount ?? merged.amount };
}

export const transferHandlers = [
  getTransfersMockHandler(({ request }) => {
    const params = query(request);
    const date = params.get("date");
    return paginate(
      transfers.filter((item) => !date || item.date === date),
      params,
    );
  }),
  getCreateTransferMockHandler(async ({ request }) => {
    const base: TransferResponse = {
      id: NEW_ID,
      fromAccountId: checkingAccount.id,
      toAccountId: checkingAccount.id,
      amount: "0.00",
      currency: "eur",
      receivedAmount: "0.00",
      receivedCurrency: "eur",
      date: FIXTURE_TODAY,
      description: null,
      createdAt: CREATED_AT,
      fromAccountImported: false,
      toAccountImported: false,
    };
    return mergeTransfer(base, await readBody(request));
  }),
  getUpdateTransferMockHandler(updateFrom(transfers, mergeTransfer)),
  getDeleteTransferMockHandler(),
];
