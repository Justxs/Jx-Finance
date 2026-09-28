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

  const sorted = accounts.data
    .map((account) => ({
      id: account.id,
      name: account.name,
      amount: Number(account.reportingBalance),
    }))
    .toSorted((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  if (sorted.length === 0) {
    return <EmptyText>{t("dashboard.noAccounts")}</EmptyText>;
  }

  const folded = sorted.length > limit;
  const shown = folded ? sorted.slice(0, limit - 1) : sorted;
  const rest = sorted.slice(shown.length);
  const rows = folded
    ? [
        ...shown,
        {
          id: "other",
          name: t("dashboard.otherAccounts", { count: rest.length }),
          amount: rest.reduce((sum, row) => sum + row.amount, 0),
        },
      ]
    : shown;

  return <ShareBars rows={rows} />;
}
