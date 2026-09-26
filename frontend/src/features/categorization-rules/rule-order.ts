import type { CategorizationRuleResponse, MoveDirection } from "@/api/generated/model";
import { swapAdjacent } from "@/lib/reorder";

interface MoveVariables {
  id: string;
  data: { direction: MoveDirection };
}

export function movedRules(
  rules: CategorizationRuleResponse[],
  { id, data }: MoveVariables,
): CategorizationRuleResponse[] {
  const index = rules.findIndex((rule) => rule.id === id);
  const next = swapAdjacent(rules, index, data.direction);
  return next ? next.map((rule, position) => ({ ...rule, position })) : rules;
}
