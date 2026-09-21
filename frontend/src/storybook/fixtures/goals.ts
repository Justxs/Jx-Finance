import type { GoalResponse } from "@/api/generated/model";
import { ids } from "./base";

export const goalWithTargetDate: GoalResponse = {
  id: ids.goals.vacation,
  name: "Atostogos Madeiroje visai šeimai",
  targetAmount: "3200.00",
  currentAmount: "1875.50",
  targetDate: "2027-06-15",
  funding: "manual",
  fundingAccountId: null,
  fundingSharePercent: 100,
  progressAmount: "1875.50",
};

export const openEndedGoal: GoalResponse = {
  id: ids.goals.emergencyFund,
  name: "Nenumatytų išlaidų fondas – šešių mėnesių pragyvenimo išlaidų rezervas šeimai",
  targetAmount: "15000.00",
  currentAmount: "12500.00",
  targetDate: null,
  funding: "manual",
  fundingAccountId: null,
  fundingSharePercent: 100,
  progressAmount: "12500.00",
};

export const completedGoal: GoalResponse = {
  id: ids.goals.bicycle,
  name: "Naujas dviratis",
  targetAmount: "900.00",
  currentAmount: "900.00",
  targetDate: "2026-08-01",
  funding: "manual",
  fundingAccountId: null,
  fundingSharePercent: 100,
  progressAmount: "900.00",
};

export const accountFundedGoal: GoalResponse = {
  id: ids.goals.houseDeposit,
  name: "Pradinis įnašas būstui",
  targetAmount: "25000.00",
  currentAmount: "0.00",
  targetDate: "2028-03-01",
  funding: "account",
  fundingAccountId: ids.accounts.savings,
  fundingSharePercent: 100,
  progressAmount: "12500.00",
};

export const sharedFundedGoal: GoalResponse = {
  id: ids.goals.carReplacement,
  name: "Automobilio keitimas",
  targetAmount: "9000.00",
  currentAmount: "450.00",
  targetDate: null,
  funding: "account",
  fundingAccountId: ids.accounts.checking,
  fundingSharePercent: 40,
  progressAmount: "1137.27",
};

export const unavailableFundedGoal: GoalResponse = {
  id: ids.goals.holidayHome,
  name: "Sodyba prie ežero",
  targetAmount: "40000.00",
  currentAmount: "2500.00",
  targetDate: "2030-05-01",
  funding: "account",
  fundingAccountId: ids.accounts.archived,
  fundingSharePercent: 100,
  progressAmount: null,
};

export const goals: GoalResponse[] = [
  goalWithTargetDate,
  openEndedGoal,
  completedGoal,
  accountFundedGoal,
  sharedFundedGoal,
];
