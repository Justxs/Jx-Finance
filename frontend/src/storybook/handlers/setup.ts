import {
  getFinishSetupMockHandler,
  getLoadDemoDataMockHandler,
  getRemoveDemoDataMockHandler,
  getSetupMockHandler,
  getSetupReadinessMockHandler,
  getSetupStatusMockHandler,
} from "@/api/generated/setup/setup.msw";
import { currentUser, setupStatus } from "@/storybook/fixtures";
import { readBody } from "./http";
import { mergeProfile } from "./users";

export const setupHandlers = [
  getSetupStatusMockHandler(setupStatus),
  getSetupMockHandler(async ({ request }) => mergeProfile(currentUser, await readBody(request))),
  getFinishSetupMockHandler(),
  getLoadDemoDataMockHandler(),
  getRemoveDemoDataMockHandler(),
  getSetupReadinessMockHandler({ receiptReaderInstalled: true }),
];
