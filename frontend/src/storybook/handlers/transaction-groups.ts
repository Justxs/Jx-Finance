import {
  getAddToTransactionGroupMockHandler,
  getCreateTransactionGroupMockHandler,
  getRemoveFromTransactionGroupMockHandler,
  getRenameTransactionGroupMockHandler,
  getTransactionGroupMembersMockHandler,
  getTransactionGroupsMockHandler,
  getUngroupTransactionGroupMockHandler,
} from "@/api/generated/transaction-groups/transaction-groups.msw";
import {
  FIXTURE_TODAY,
  transactionGroups,
  tripGroup,
  tripGroupMembers,
} from "@/storybook/fixtures";
import { found, notFound, query, readBody, text } from "./http";
import { NEW_ID } from "./ids";
import { byId } from "./lists";
import { filterRows } from "./transactions";

export const transactionGroupHandlers = [
  getTransactionGroupsMockHandler(transactionGroups),
  getTransactionGroupMembersMockHandler(({ params, request }) => {
    if (params.id !== tripGroup.id) {
      throw notFound();
    }
    return { items: filterRows(tripGroupMembers, query(request)), truncated: false };
  }),
  getCreateTransactionGroupMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const members = Array.isArray(body.transactionIds) ? body.transactionIds : [];
    return {
      id: NEW_ID,
      name: text(body.name) ?? "",
      memberCount: members.length,
      firstDate: FIXTURE_TODAY,
      lastDate: FIXTURE_TODAY,
    };
  }),
  getRenameTransactionGroupMockHandler(async ({ params, request }) => {
    const group = found(byId(transactionGroups, params.id));
    return { ...group, name: text((await readBody(request)).name) ?? group.name };
  }),
  getAddToTransactionGroupMockHandler(),
  getRemoveFromTransactionGroupMockHandler(),
  getUngroupTransactionGroupMockHandler(),
];
