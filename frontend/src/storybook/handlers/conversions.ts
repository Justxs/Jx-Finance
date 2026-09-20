import {
  getCreateConversionMockHandler,
  getDeleteConversionMockHandler,
  getConversionsMockHandler,
  getUpdateConversionMockHandler,
} from "@/api/generated/conversions/conversions.msw";
import type { ConversionResponse } from "@/api/generated/model";
import { conversions } from "@/storybook/fixtures";
import { found, readBody, text } from "./http";
import { CREATED_AT, NEW_ID } from "./ids";
import { byId, paginate } from "./lists";

export const conversionHandlers = [
  getConversionsMockHandler(({ request }) => {
    const params = new URL(request.url).searchParams;
    const accountId = params.get("accountId");
    return paginate(
      conversions.filter((item) => !accountId || item.accountId === accountId),
      params,
    );
  }),
  getCreateConversionMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const created: ConversionResponse = {
      ...conversions[0]!,
      id: NEW_ID,
      description: null,
      feeAmount: null,
      feeCurrency: null,
      feeTransactionId: null,
      createdAt: CREATED_AT,
      ...body,
    };
    const rate = Number(created.toAmount) / Number(created.fromAmount);
    return { ...created, rate: rate.toFixed(6) };
  }),
  getUpdateConversionMockHandler(async ({ params, request }) => {
    const existing = found(byId(conversions, params.id));
    const body = await readBody(request);
    const merged: ConversionResponse = { ...existing, ...body };
    const updated: ConversionResponse =
      text(body.feeAmount) === null
        ? {
            ...merged,
            feeAmount: null,
            feeCurrency: null,
            feeCategoryId: null,
            feeTransactionId: null,
          }
        : { ...merged, feeTransactionId: existing.feeTransactionId ?? NEW_ID };
    const rate = Number(updated.toAmount) / Number(updated.fromAmount);
    return { ...updated, rate: rate.toFixed(6) };
  }),
  getDeleteConversionMockHandler(),
];
