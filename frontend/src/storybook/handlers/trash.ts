import { getRestoreDeletedMockHandler, getTrashMockHandler } from "@/api/generated/trash/trash.msw";
import { trashEntries } from "@/storybook/fixtures";
import { paginate } from "./lists";

export const trashHandlers = [
  getTrashMockHandler(({ request }) => paginate(trashEntries, new URL(request.url).searchParams)),
  getRestoreDeletedMockHandler(),
];
