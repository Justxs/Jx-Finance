import { BudgetPeriod } from "@/api/generated/model";
import type { Translate } from "@/lib/i18n";
import type { NamedOption } from "@/lib/options";

export function budgetPeriodLabel(t: Translate, period: BudgetPeriod) {
  return t(`budgets.periods.${period}`);
}

const periodOrder: readonly BudgetPeriod[] = [
  BudgetPeriod.weekly,
  BudgetPeriod.monthly,
  BudgetPeriod.quarterly,
  BudgetPeriod.yearly,
];

export function budgetPeriodOptions(t: Translate): NamedOption[] {
  return periodOrder.map((period) => ({ value: period, label: budgetPeriodLabel(t, period) }));
}
