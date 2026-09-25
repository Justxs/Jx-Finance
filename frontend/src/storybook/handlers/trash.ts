import { getRestoreDeletedMockHandler, getTrashMockHandler } from "@/api/generated/trash/trash.msw";
import { trashEntries } from "@/storybook/fixtures";
import { query } from "./http";
import { paginate } from "./lists";

export const trashHandlers = [
  getTrashMockHandler(({ request }) => paginate(trashEntries, query(request))),
  getRestoreDeletedMockHandler(),
];
