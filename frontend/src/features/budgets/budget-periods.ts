import { BudgetPeriod } from "@/api/generated/model";
import type { Translate } from "@/lib/i18n";
import { type SelectOption, optionsOf } from "@/lib/options";

export function budgetPeriodLabel(t: Translate, period: BudgetPeriod) {
  return t(`budgets.periods.${period}`);
}

export const periodOrder: readonly BudgetPeriod[] = [
  BudgetPeriod.weekly,
  BudgetPeriod.monthly,
  BudgetPeriod.quarterly,
  BudgetPeriod.yearly,
];

export function budgetPeriodOptions(t: Translate): SelectOption<string, string>[] {
  return optionsOf(periodOrder, (period) => budgetPeriodLabel(t, period));
}
