import type { CategorizationRuleResponse, MoveDirection } from "@/api/generated/model";

interface MoveVariables {
  id: string;
  data: { direction: MoveDirection };
}

export function movedRules(
  rules: CategorizationRuleResponse[],
  { id, data }: MoveVariables,
): CategorizationRuleResponse[] {
  const index = rules.findIndex((rule) => rule.id === id);
  const target = data.direction === "up" ? index - 1 : index + 1;
  const moving = rules[index];
  const other = rules[target];
  if (index < 0 || moving === undefined || other === undefined) {
    return rules;
  }

  const next = [...rules];
  next[index] = other;
  next[target] = moving;
  return next.map((rule, position) => ({ ...rule, position }));
}
