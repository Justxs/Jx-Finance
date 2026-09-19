import { getSetupStatusMockHandler, getSetupMockHandler } from "@/api/generated/setup/setup.msw";
import { currentUser, setupStatus } from "@/storybook/fixtures";
import { readBody } from "./http";
import { mergeProfile } from "./users";

export const setupHandlers = [
  getSetupStatusMockHandler(setupStatus),
  getSetupMockHandler(async ({ request }) => mergeProfile(currentUser, await readBody(request))),
];
