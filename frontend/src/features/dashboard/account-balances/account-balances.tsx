import { useTranslation } from "react-i18next";
import { useAccountsSuspense } from "@/api/generated";
import { ShareBars } from "@/components/share-bars/share-bars";
import { EmptyText } from "@/components/ui/empty-text/empty-text";

interface Props {
  limit?: number;
}

export function AccountBalances({ limit = 6 }: Readonly<Props>) {
  const { t } = useTranslation();
  const accounts = useAccountsSuspense();

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
