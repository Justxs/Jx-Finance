import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PayeeBreakdownItem } from "@/api/generated/model";
import { BreakdownList, breakdownWeight } from "@/components/breakdown-list/breakdown-list";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";

const SHOWN_ROWS = 8;

interface Props {
  items: PayeeBreakdownItem[];
  dateFrom?: string;
  dateTo?: string;
}

export function PayeeBreakdown({ items, dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const rows = items.filter((item) => breakdownWeight(item) > 0);
  const shown = showAll ? rows : rows.slice(0, SHOWN_ROWS);

  if (rows.length === 0) {
    return <EmptyText>{t("reports.noPayeeSpending")}</EmptyText>;
  }

  return (
    <div className="space-y-3">
      <BreakdownList
        rows={shown.map((row) => ({
          key: row.payeeKey ?? "",
          name: row.payeeKey ? (row.name ?? row.label ?? row.payeeKey) : t("reports.noDescription"),
          amount: Number(row.amount),
          comparisonAmount: row.comparisonAmount,
          filter: row.payeeKey ? { payee: row.payeeKey } : undefined,
          muted: !row.payeeKey,
        }))}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
      {shown.length < rows.length ? (
        <Button type="button" variant="link-muted" size="inline" onClick={() => setShowAll(true)}>
          {t("reports.showAllPayees")}
        </Button>
      ) : null}
      <p className="text-xs text-muted-foreground">{t("reports.payeeHint")}</p>
    </div>
  );
}
