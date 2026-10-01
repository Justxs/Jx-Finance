import {
  getRestoreDeletedMockHandler,
  getRestoreTransactionsMockHandler,
  getTrashMockHandler,
} from "@/api/generated/trash/trash.msw";
import { trashEntries } from "@/storybook/fixtures";
import { query, readBody } from "./http";
import { paginate } from "./lists";

export const trashHandlers = [
  getTrashMockHandler(({ request }) => paginate(trashEntries, query(request))),
  getRestoreDeletedMockHandler(),
  getRestoreTransactionsMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const ids = Array.isArray(body.transactionIds) ? body.transactionIds : [];
    return { restored: ids.length, refused: [] };
  }),
];
