import { Scale } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCountOpenBalances, useNetWorthSuspense } from "@/api/generated";
import { Button } from "@/components/ui/button/button";
import { useFeature } from "@/hooks/use-settings";

export function OpenBalancesToggle() {
  const { t } = useTranslation();
  const householdsEnabled = useFeature("households");
  const counted = useNetWorthSuspense().data.countsOpenBalances;
  const mutation = useCountOpenBalances();

  if (!householdsEnabled) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={counted}
      pending={mutation.isPending}
      tooltip={t("netWorth.openBalances.hint")}
      onClick={() => mutation.mutate({ data: { count: !counted } })}
    >
      <Scale />
      {t("netWorth.openBalances.label")}
    </Button>
  );
}
