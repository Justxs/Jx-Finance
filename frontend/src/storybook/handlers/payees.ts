import {
  getDeletePayeeNameMockHandler,
  getPayeeNamesMockHandler,
  getSetPayeeNameMockHandler,
} from "@/api/generated/payees/payees.msw";
import { payeeNames } from "@/storybook/fixtures";
import { readBody, text } from "./http";
import { NEW_ID } from "./ids";

export const payeeHandlers = [
  getPayeeNamesMockHandler(payeeNames),
  getSetPayeeNameMockHandler(async ({ request }) => {
    const body = await readBody(request);
    return {
      id: NEW_ID,
      payeeKey: text(body.payee)?.toLowerCase() ?? "",
      name: text(body.name) ?? "",
    };
  }),
  getDeletePayeeNameMockHandler(),
];
