import { useTranslation } from "react-i18next";
import type { HoldingResponse } from "@/api/generated/model";
import { ShareBars } from "@/components/share-bars/share-bars";
import { TitledSection } from "@/components/ui/section/section";

const MAX_ROWS = 8;

interface Props {
  holdings: readonly HoldingResponse[];
  currency: string;
}

export function AllocationSection({ holdings, currency }: Readonly<Props>) {
  const { t } = useTranslation();

  const bySecurity = new Map<
    string,
    { id: string; name: string; detail: string; amount: number }
  >();
  for (const holding of holdings) {
    if (holding.marketValueReporting === null) {
      continue;
    }
    const existing = bySecurity.get(holding.security.id);
    bySecurity.set(holding.security.id, {
      id: holding.security.id,
      name: holding.security.symbol,
      detail: holding.security.name,
      amount: (existing?.amount ?? 0) + Number(holding.marketValueReporting),
    });
  }

  const sorted = [...bySecurity.values()].toSorted((a, b) => b.amount - a.amount);
  const restTotal = sorted.slice(MAX_ROWS).reduce((sum, row) => sum + row.amount, 0);
  const rows = [
    ...sorted.slice(0, MAX_ROWS),
    ...(restTotal > 0 ? [{ id: "other", name: t("dashboard.other"), amount: restTotal }] : []),
  ];

  if (rows.length < 2) {
    return null;
  }

  return (
    <TitledSection title={t("investments.allocation")} bodyGap="md">
      <ShareBars rows={rows} currency={currency} />
    </TitledSection>
  );
}
