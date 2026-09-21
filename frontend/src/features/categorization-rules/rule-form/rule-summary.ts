import type { CategorizationRuleResponse, DescriptionMatch } from "@/api/generated/model";
import type { Translate } from "@/lib/i18n";

export function conditionText(
  t: Translate,
  match: DescriptionMatch,
  pattern: string,
  accountName: string | undefined,
  minAmount: string | null,
  maxAmount: string | null,
): string {
  const parts = [
    `${t("categorizationRules.condition")} ${t(`categorizationRules.matches.${match}`)} "${pattern}"`,
  ];
  if (accountName) {
    parts.push(t("categorizationRules.onAccount", { account: accountName }));
  }
  if (minAmount && maxAmount) {
    parts.push(t("categorizationRules.amountRange", { from: minAmount, to: maxAmount }));
  } else if (minAmount) {
    parts.push(t("categorizationRules.amountFrom", { from: minAmount }));
  } else if (maxAmount) {
    parts.push(t("categorizationRules.amountTo", { to: maxAmount }));
  }
  return parts.join(", ");
}

export function actionText(
  t: Translate,
  categoryName: string | undefined,
  tagNames: readonly string[],
): string {
  const parts = [categoryName, ...tagNames].filter((part) => part !== undefined && part !== "");
  return parts.length === 0 ? t("categorizationRules.testerNothing") : parts.join(", ");
}

export function ruleActionNames(
  rule: Pick<CategorizationRuleResponse, "categoryId" | "tagIds">,
  categoryNames: ReadonlyMap<string, string>,
  tagNames: ReadonlyMap<string, string>,
): { categoryName: string | undefined; tagNames: string[] } {
  return {
    categoryName: rule.categoryId ? categoryNames.get(rule.categoryId) : undefined,
    tagNames: rule.tagIds
      .map((id) => tagNames.get(id))
      .filter((name) => name !== undefined)
      .toSorted((a, b) => a.localeCompare(b, "lt")),
  };
}
