import { Target } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AllocationDimension,
  AllocationTargetsResponse,
  HoldingResponse,
  PortfolioSlice,
} from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { ShareBars } from "@/components/share-bars/share-bars";
import { Button } from "@/components/ui/button/button";
import { Hint } from "@/components/ui/field-error";
import { TitledSection } from "@/components/ui/section/section";
import { SegmentedControl } from "@/components/ui/segmented-control/segmented-control";
import {
  AllocationDrift,
  type DriftRow,
} from "@/features/investments/allocation-drift/allocation-drift";
import {
  AllocationTargetsForm,
  type TargetChoice,
} from "@/features/investments/allocation-targets-form/allocation-targets-form";
import { securityTypes } from "@/features/investments/investment-types";
import { optionsOf } from "@/lib/options";

const VIEWS = ["security", "type", "currency"] as const satisfies readonly AllocationDimension[];

const MAX_ROWS = 8;

interface Bucket {
  id: string;
  name: string;
  detail?: string;
  amount: number;
}

interface Props {
  holdings: readonly HoldingResponse[];
  byType: readonly PortfolioSlice[];
  byCurrency: readonly PortfolioSlice[];
  currency: string;
  targets: AllocationTargetsResponse;
}

export function AllocationSection({
  holdings,
  byType,
  byCurrency,
  currency,
  targets,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [view, setView] = useState<AllocationDimension>(targets.dimension ?? "security");
  const [editing, setEditing] = useState(false);

  function typeName(key: string) {
    const type = securityTypes.find((item) => item === key);
    return type ? t(`investments.securityTypes.${type}`) : key;
  }

  const bySecurity = new Map<string, Bucket>();
  for (const holding of holdings) {
    if (holding.marketValueReporting === null || Number(holding.quantity) === 0) {
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

  const buckets: Record<AllocationDimension, Bucket[]> = {
    security: [...bySecurity.values()].toSorted((a, b) => b.amount - a.amount),
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

  function targetName(dimension: AllocationDimension, key: string, symbol: string | null) {
    if (dimension === "type") {
      return typeName(key);
    }
    return dimension === "currency" ? key.toUpperCase() : (symbol ?? key);
  }

  function withTargeted(dimension: AllocationDimension): Bucket[] {
    const held = buckets[dimension];
    const missing =
      targets.dimension === dimension
        ? targets.targets
            .filter((target) => !held.some((bucket) => bucket.id === target.key))
            .map((target) => ({
              id: target.key,
              name: targetName(dimension, target.key, target.symbol),
              amount: 0,
            }))
        : [];
    return [...held, ...missing];
  }

  const choices: Record<AllocationDimension, TargetChoice[]> = {
    security: withTargeted("security"),
    type: securityTypes.map((type) => ({ id: type, name: typeName(type) })),
    currency: withTargeted("currency"),
  };

  if (bySecurity.size === 0) {
    return null;
  }

  const hasTargets = targets.dimension !== null && targets.targets.length > 0;
  const sorted = buckets.security;
  const restTotal = sorted.slice(MAX_ROWS).reduce((sum, row) => sum + row.amount, 0);
  const securityRows = [
    ...sorted.slice(0, MAX_ROWS),
    ...(restTotal > 0 ? [{ id: "other", name: t("dashboard.other"), amount: restTotal }] : []),
  ];
  const driftRows: DriftRow[] = withTargeted(view).map((bucket) => ({
    id: bucket.id,
    name: bucket.name,
    detail: bucket.detail,
    value: bucket.amount,
    target: Number(targets.targets.find((target) => target.key === bucket.id)?.share ?? 0),
  }));

  return (
    <TitledSection title={t("investments.allocation")} bodyGap="md">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            aria-label={t("investments.allocationBy")}
            value={view}
            onChange={setView}
            options={optionsOf(VIEWS, (option) => t(`investments.allocationViews.${option}`))}
          />
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Target />
            {hasTargets
              ? t("investments.allocationTargets.edit")
              : t("investments.allocationTargets.set")}
          </Button>
        </div>
        {hasTargets && targets.dimension === view ? (
          <AllocationDrift rows={driftRows} currency={currency} />
        ) : (
          <>
            {hasTargets && targets.dimension ? (
              <Hint>
                {t("investments.allocationTargets.otherDimension", {
                  dimension: t(`investments.allocationViews.${targets.dimension}`),
                })}
              </Hint>
            ) : null}
            <ShareBars
              rows={view === "security" ? securityRows : buckets[view]}
              currency={currency}
            />
          </>
        )}
      </div>
      <Modal
        open={editing}
        onOpenChange={setEditing}
        title={t("investments.allocationTargets.title")}
        description={t("investments.allocationTargets.description")}
      >
        <AllocationTargetsForm
          targets={targets}
          dimension={targets.dimension ?? view}
          choices={choices}
          onSaved={(saved) => {
            setEditing(false);
            if (saved.dimension) {
              setView(saved.dimension);
            }
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </TitledSection>
  );
}
