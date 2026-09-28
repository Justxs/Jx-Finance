import { useTranslation } from "react-i18next";
import { useAccountsSuspense } from "@/api/generated";
import { ShareBars } from "@/components/share-bars/share-bars";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { asOfParams } from "../dashboard-queries";

interface Props {
  limit?: number;
  asOf?: string;
}

export function AccountBalances({ limit = 6, asOf }: Readonly<Props>) {
  const { t } = useTranslation();
  const accounts = useAccountsSuspense(asOfParams(asOf));

  const rows = accounts.data
    .map((account) => ({
      id: account.id,
      name: account.name,
      amount: Number(account.reportingBalance),
    }))
    .toSorted((a, b) => b.amount - a.amount)
    .slice(0, limit);

  if (rows.length === 0) {
    return <EmptyText>{t("dashboard.noAccounts")}</EmptyText>;
  }

  return <ShareBars rows={rows} />;
}
