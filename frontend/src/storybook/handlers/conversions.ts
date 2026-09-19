import {
  getCreateConversionMockHandler,
  getDeleteConversionMockHandler,
  getConversionsMockHandler,
} from "@/api/generated/conversions/conversions.msw";
import type { ConversionResponse } from "@/api/generated/model";
import { conversions } from "@/storybook/fixtures";
import { readBody } from "./http";
import { CREATED_AT, NEW_ID } from "./ids";
import { paginate } from "./lists";

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
  getDeleteConversionMockHandler(),
];
