import { useTranslation } from "react-i18next";
import { useBudgetsSuspense } from "@/api/generated";
import { BudgetRows } from "@/components/budget-rows/budget-rows";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { TextLink } from "@/components/ui/text-link/text-link";
import { asOfParams } from "@/features/dashboard/dashboard-queries";
import { useShare, withShare } from "@/stores/my-share-store";

interface Props {
  asOf?: string;
}

export function BudgetSnapshot({ asOf }: Readonly<Props>) {
  const { t } = useTranslation();
  const budgets = useBudgetsSuspense(withShare(asOfParams(asOf), useShare()));

  if (budgets.data.length === 0) {
    return (
      <EmptyText>
        {t("dashboard.noBudgets")} <TextLink to="/budgets">{t("budgets.add")}</TextLink>
      </EmptyText>
    );
  }

  return <BudgetRows budgets={budgets.data} ended={asOf !== undefined} />;
}
