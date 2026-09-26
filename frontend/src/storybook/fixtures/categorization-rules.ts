import type { CategorizationRuleResponse, RunRulesResponse } from "@/api/generated/model";
import { ids } from "./base";

interface RuleOverrides {
  accountId?: string | null;
  minAmount?: string | null;
  maxAmount?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
}

function rule(
  id: string,
  name: string,
  position: number,
  match: CategorizationRuleResponse["match"],
  pattern: string,
  overrides: RuleOverrides = {},
): CategorizationRuleResponse {
  return {
    id,
    name,
    position,
    match,
    pattern,
    accountId: overrides.accountId ?? null,
    minAmount: overrides.minAmount ?? null,
    maxAmount: overrides.maxAmount ?? null,
    categoryId: overrides.categoryId ?? null,
    tagIds: overrides.tagIds ?? [],
  };
}

export const categorizationRules: CategorizationRuleResponse[] = [
  rule(ids.rules.groceries, "Parduotuvės", 0, "contains", "MAXIMA", {
    categoryId: ids.categories.food,
  }),
  rule(ids.rules.transport, "Viešasis transportas", 1, "startsWith", "TRAFI", {
    categoryId: ids.categories.transport,
    maxAmount: "50.00",
  }),
  rule(ids.rules.utilities, "Elektra", 2, "contains", "IGNITIS", {
    categoryId: ids.categories.utilities,
    accountId: ids.accounts.checking,
  }),
  rule(ids.rules.salary, "Atlyginimas", 3, "contains", "DARBO UŽMOKESTIS", {
    categoryId: ids.categories.salary,
    minAmount: "500.00",
  }),
  rule(ids.rules.holidayCard, "Atostogų kortelė", 4, "contains", "BOOKING.COM", {
    tagIds: [ids.tags.holiday],
  }),
];

export const rulesRunPreview: RunRulesResponse = {
  rules: [
    { ruleId: ids.rules.groceries, name: "Parduotuvės", rowCount: 18 },
    { ruleId: ids.rules.transport, name: "Viešasis transportas", rowCount: 4 },
    { ruleId: ids.rules.utilities, name: "Elektra", rowCount: 2 },
    { ruleId: ids.rules.salary, name: "Atlyginimas", rowCount: 0 },
    { ruleId: ids.rules.holidayCard, name: "Atostogų kortelė", rowCount: 3 },
  ],
  total: 27,
  recategorize: false,
};

export const rulesRunNothing: RunRulesResponse = {
  rules: categorizationRules.map((item) => ({ ruleId: item.id, name: item.name, rowCount: 0 })),
  total: 0,
  recategorize: false,
};

export const ruleTestNoMatch = {
  matches: false,
  descriptionMatches: false,
  amountMatches: true,
};

export const ruleTestAmountOnly = {
  matches: false,
  descriptionMatches: true,
  amountMatches: false,
};
