import type { GoalResponse } from "@/api/generated/model";
import { ids } from "./base";

export const goalWithTargetDate: GoalResponse = {
  id: ids.goals.vacation,
  name: "Atostogos Madeiroje visai šeimai",
  targetAmount: "3200.00",
  currentAmount: "1875.50",
  targetDate: "2027-06-15",
};

export const openEndedGoal: GoalResponse = {
  id: ids.goals.emergencyFund,
  name: "Nenumatytų išlaidų fondas – šešių mėnesių pragyvenimo išlaidų rezervas šeimai",
  targetAmount: "15000.00",
  currentAmount: "12500.00",
  targetDate: null,
};

export const completedGoal: GoalResponse = {
  id: ids.goals.bicycle,
  name: "Naujas dviratis",
  targetAmount: "900.00",
  currentAmount: "900.00",
  targetDate: "2026-08-01",
};

export const goals: GoalResponse[] = [goalWithTargetDate, openEndedGoal, completedGoal];
