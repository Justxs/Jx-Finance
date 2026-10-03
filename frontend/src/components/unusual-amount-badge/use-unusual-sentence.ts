import { useTranslation } from "react-i18next";
import type { UnusualAmountResponse } from "@/api/generated/model";
import { useMoney, useNumberFormat } from "@/hooks/use-formatters";

export function useUnusualSentence() {
  const { t } = useTranslation();
  const money = useMoney();
  const factorFormat = useNumberFormat({ maximumFractionDigits: 1 });

  return function sentence(unusual: UnusualAmountResponse) {
    const values = {
      factor: factorFormat.format(unusual.factor),
      typical: money.format(Number(unusual.typicalAmount)),
    };
    return t(`transactions.unusual.${unusual.basis}`, values);
  };
}
