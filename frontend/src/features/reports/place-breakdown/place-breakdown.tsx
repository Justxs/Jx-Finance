import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PlaceBreakdownItem } from "@/api/generated/model";
import { BreakdownList } from "@/components/breakdown-list/breakdown-list";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { SegmentedControl } from "@/components/ui/segmented-control/segmented-control";
import { PlaceMap } from "@/features/reports/place-map";
import { breakdownWeight } from "@/lib/comparison";
import { useMapTilesPresent } from "@/lib/map-tiles";

const SHOWN_ROWS = 8;

type PlaceView = "list" | "map";

interface Props {
  items: PlaceBreakdownItem[];
  dateFrom?: string;
  dateTo?: string;
}

export function PlaceBreakdown({ items, dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState<PlaceView>("list");
  const tilesPresent = useMapTilesPresent();

  const rows = items.filter((item) => breakdownWeight(item) > 0);
  const shown = showAll ? rows : rows.slice(0, SHOWN_ROWS);

  if (rows.length === 0) {
    return <EmptyText>{t("reports.expenseByPlace.empty")}</EmptyText>;
  }

  function openLedger(place: string) {
    void navigate({
      to: "/transactions",
      search: {
        page: 1,
        place,
        type: "expense",
        dateFrom,
        dateTo,
        spreadOverlap: dateFrom && dateTo ? true : undefined,
      },
    });
  }

  return (
    <div className="space-y-3">
      {tilesPresent ? (
        <SegmentedControl<PlaceView>
          aria-label={t("reports.expenseByPlace.view")}
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: t("reports.expenseByPlace.list") },
            { value: "map", label: t("reports.expenseByPlace.map") },
          ]}
        />
      ) : null}
      {tilesPresent && view === "map" ? (
        <PlaceMap items={rows} onSelect={openLedger} />
      ) : (
        <>
          <BreakdownList
            rows={shown.map((row) => ({
              key: row.place?.toLowerCase() ?? "",
              name: row.place ?? t("reports.expenseByPlace.noPlace"),
              amount: Number(row.amount),
              comparisonAmount: row.comparisonAmount,
              filter: row.place ? { place: row.place } : undefined,
              muted: !row.place,
            }))}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
          {shown.length < rows.length ? (
            <Button
              type="button"
              variant="link-muted"
              size="inline"
              onClick={() => setShowAll(true)}
            >
              {t("reports.expenseByPlace.showAll")}
            </Button>
          ) : null}
        </>
      )}
      <p className="text-xs text-muted-foreground">{t("reports.expenseByPlace.hint")}</p>
    </div>
  );
}
