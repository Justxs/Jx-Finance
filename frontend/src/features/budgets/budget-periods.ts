import { budgetPeriodLabel, periodOrder } from "@/lib/budgets";
import type { Translate } from "@/lib/i18n";
import { type SelectOption, optionsOf } from "@/lib/options";

export function budgetPeriodOptions(t: Translate): SelectOption<string, string>[] {
  return optionsOf(periodOrder, (period) => budgetPeriodLabel(t, period));
}
