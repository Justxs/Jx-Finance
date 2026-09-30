import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { HoldingResponse, PortfolioSlice } from "@/api/generated/model";
import { ShareBars } from "@/components/share-bars/share-bars";
import { TitledSection } from "@/components/ui/section/section";
import { SegmentedControl } from "@/components/ui/segmented-control/segmented-control";
import { securityTypes } from "@/features/investments/investment-types";
import { optionsOf } from "@/lib/options";

const VIEWS = ["security", "type", "currency"] as const;

type AllocationView = (typeof VIEWS)[number];

const MAX_ROWS = 8;

interface Props {
  holdings: readonly HoldingResponse[];
  byType: readonly PortfolioSlice[];
  byCurrency: readonly PortfolioSlice[];
  currency: string;
}

export function AllocationSection({ holdings, byType, byCurrency, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  const [view, setView] = useState<AllocationView>("security");

  function typeName(key: string) {
    const type = securityTypes.find((item) => item === key);
    return type ? t(`investments.securityTypes.${type}`) : key;
  }

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
  const securityRows = [
    ...sorted.slice(0, MAX_ROWS),
    ...(restTotal > 0 ? [{ id: "other", name: t("dashboard.other"), amount: restTotal }] : []),
  ];
  const slices = {
    type: byType.map((slice) => ({
      id: slice.key,
      name: typeName(slice.key),
      amount: Number(slice.marketValue),
    })),
    currency: byCurrency.map((slice) => ({
      id: slice.key,
      name: slice.key.toUpperCase(),
      amount: Number(slice.marketValue),
    })),
  };
  const rows = view === "security" ? securityRows : slices[view];

  if (securityRows.length < 2) {
    return null;
  }

  return (
    <TitledSection title={t("investments.allocation")} bodyGap="md">
      <SegmentedControl
        aria-label={t("investments.allocationBy")}
        value={view}
        onChange={setView}
        options={optionsOf(VIEWS, (option) => t(`investments.allocationViews.${option}`))}
      />
      <ShareBars rows={rows} currency={currency} />
    </TitledSection>
  );
}
