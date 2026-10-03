import type { CreateCategorizationRuleRequest, SuggestedRuleResponse } from "@/api/generated/model";

export function ruleFromSuggestion(
  suggestion: SuggestedRuleResponse,
): CreateCategorizationRuleRequest {
  return {
    name: suggestion.name,
    match: suggestion.match,
    pattern: suggestion.pattern,
    categoryId: suggestion.categoryId,
    tagIds: [],
    accountId: null,
    minAmount: null,
    maxAmount: null,
  };
}
