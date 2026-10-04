import type { GoalResponse } from "@/api/generated/model";
import { ids, type Seed } from "./base";
import { problemOf } from "./problems";

const goalDefaults = {
  targetDate: null,
  funding: "manual",
  fundingAccountId: null,
  fundingSharePercent: 100,
  scope: "personal",
  householdId: null,
  version: 1,
} satisfies Partial<GoalResponse>;

export function goal(seed: Seed<GoalResponse, typeof goalDefaults>): GoalResponse {
  return { ...goalDefaults, ...seed };
}

export const goalWithTargetDate = goal({
  id: ids.goals.vacation,
  name: "Atostogos Madeiroje visai šeimai",
  targetAmount: "3200.00",
  currentAmount: "1875.50",
  targetDate: "2027-06-15",
  progressAmount: "1875.50",
});

export const openEndedGoal = goal({
  id: ids.goals.emergencyFund,
  name: "Nenumatytų išlaidų fondas – šešių mėnesių pragyvenimo išlaidų rezervas šeimai",
  targetAmount: "15000.00",
  currentAmount: "12500.00",
  progressAmount: "12500.00",
});

export const completedGoal = goal({
  id: ids.goals.bicycle,
  name: "Naujas dviratis",
  targetAmount: "900.00",
  currentAmount: "900.00",
  targetDate: "2026-08-01",
  progressAmount: "900.00",
});

export const accountFundedGoal = goal({
  id: ids.goals.houseDeposit,
  name: "Pradinis įnašas būstui",
  targetAmount: "25000.00",
  currentAmount: "0.00",
  targetDate: "2028-03-01",
  funding: "account",
  fundingAccountId: ids.accounts.savings,
  progressAmount: "12500.00",
});

export const sharedFundedGoal = goal({
  id: ids.goals.carReplacement,
  name: "Automobilio keitimas",
  targetAmount: "9000.00",
  currentAmount: "450.00",
  funding: "account",
  fundingAccountId: ids.accounts.checking,
  fundingSharePercent: 40,
  progressAmount: "1137.27",
});

export const unavailableFundedGoal = goal({
  id: ids.goals.holidayHome,
  name: "Sodyba prie ežero",
  targetAmount: "40000.00",
  currentAmount: "2500.00",
  targetDate: "2030-05-01",
  funding: "account",
  fundingAccountId: ids.accounts.archived,
  progressAmount: null,
});

export const goals: GoalResponse[] = [
  goalWithTargetDate,
  openEndedGoal,
  completedGoal,
  accountFundedGoal,
  sharedFundedGoal,
];

export const goalStaleProblem = problemOf(
  409,
  "conflict.stale",
  "Someone else changed this in the meantime. Load it again and redo your change.",
);
