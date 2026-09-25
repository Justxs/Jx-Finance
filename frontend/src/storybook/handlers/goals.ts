import {
  getCreateGoalMockHandler,
  getDeleteGoalMockHandler,
  getGoalsMockHandler,
  getUpdateGoalMockHandler,
} from "@/api/generated/goals/goals.msw";
import { goals } from "@/storybook/fixtures";
import { readBody } from "./http";
import { NEW_ID } from "./ids";
import { updateFrom } from "./lists";

export const goalHandlers = [
  getGoalsMockHandler(goals),
  getCreateGoalMockHandler(async ({ request }) => ({
    id: NEW_ID,
    name: "",
    targetAmount: "0.00",
    currentAmount: "0.00",
    targetDate: null,
    funding: "manual" as const,
    fundingAccountId: null,
    fundingSharePercent: 100,
    progressAmount: "0.00",
    ...(await readBody(request)),
  })),
  getUpdateGoalMockHandler(updateFrom(goals)),
  getDeleteGoalMockHandler(),
];
