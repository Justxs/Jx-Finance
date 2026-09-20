import type { TransferResponse } from "@/api/generated/model";
import {
  getCreateTransferMockHandler,
  getDeleteTransferMockHandler,
  getTransfersMockHandler,
  getUpdateTransferMockHandler,
} from "@/api/generated/transfers/transfers.msw";
import { FIXTURE_TODAY, checkingAccount, transfers } from "@/storybook/fixtures";
import { found, readBody } from "./http";
import { CREATED_AT, NEW_ID } from "./ids";
import { byId, paginate } from "./lists";

export const transferHandlers = [
  getTransfersMockHandler(({ request }) => {
    const params = new URL(request.url).searchParams;
    const date = params.get("date");
    return paginate(
      transfers.filter((item) => !date || item.date === date),
      params,
    );
  }),
  getCreateTransferMockHandler(async ({ request }) => {
    const created: TransferResponse = {
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
      ...(await readBody(request)),
    };
    return { ...created, receivedAmount: created.receivedAmount ?? created.amount };
  }),
  getUpdateTransferMockHandler(async ({ params, request }) => {
    const updated: TransferResponse = {
      ...found(byId(transfers, params.id)),
      ...(await readBody(request)),
    };
    return { ...updated, receivedAmount: updated.receivedAmount ?? updated.amount };
  }),
  getDeleteTransferMockHandler(),
];
