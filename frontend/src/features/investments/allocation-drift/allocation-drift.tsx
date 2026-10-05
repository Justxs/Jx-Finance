import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { ShareRow } from "@/components/share-row/share-row";
import { Input } from "@/components/ui/input/input";
import { allocationDrift, splitContribution } from "@/features/investments/allocation-split";
import { useMoney, useNumberFormat } from "@/hooks/use-formatters";
import { shellAria } from "@/lib/field-aria";
import { toCents } from "@/lib/money";
import { isPositiveMoney, normalizeMoney } from "@/lib/validation";

export interface DriftRow {
  id: string;
  name: string;
  detail?: string;
  value: number;
  target: number;
}

interface Props {
  rows: readonly DriftRow[];
  currency: string;
}

export function AllocationDrift({ rows, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = useNumberFormat({ style: "percent", maximumFractionDigits: 1 });
  const points = useNumberFormat({ minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const id = useId();
  const [amount, setAmount] = useState("");
  const valid = isPositiveMoney(amount);
  const error =
    amount.trim() !== "" && !valid ? t("investments.allocationTargets.amountInvalid") : undefined;

  const amountCents = valid ? toCents(amount) : 0;
  const split = splitContribution(rows, amountCents);
  const drift = allocationDrift(rows);
  const heldCents = drift.reduce((sum, row) => sum + Math.max(0, Math.round(row.value * 100)), 0);
  const scale = Math.max(0, ...drift.flatMap((row) => [row.share, row.targetShare]));

  function driftText(value: number) {
    const rounded = Math.round(value * 1000) / 10;
    if (rounded === 0) {
      return t("investments.allocationTargets.onTarget");
    }

    return t(
      rounded > 0 ? "investments.allocationTargets.over" : "investments.allocationTargets.under",
      { points: points.format(Math.abs(rounded)) },
    );
  }

  function shareAfter(value: number, added: number) {
    return (Math.max(0, Math.round(value * 100)) + added) / (heldCents + amountCents);
  }

  return (
    <div className="space-y-5">
      <ul className="space-y-3.5">
        {drift.map((row) => {
          const added = split.get(row.id);
          return (
            <ShareRow
              key={row.id}
              name={
                <span
                  className="min-w-0 flex-1 truncate"
                  title={row.detail ? `${row.name} ${row.detail}` : row.name}
                >
                  {row.name}
                  {row.detail ? (
                    <span className="ml-2 text-xs text-muted-foreground">{row.detail}</span>
                  ) : null}
                </span>
              }
              share={percent.format(row.share)}
              amount={money.format(row.value, currency)}
              wideAmount
              value={row.share}
              max={scale}
              meterMark={scale > 0 ? row.targetShare / scale : undefined}
            >
              <p className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
                <span>
                  {t("investments.allocationTargets.target", {
                    target: percent.format(row.targetShare),
                  })}
                  {" · "}
                  {driftText(row.drift)}
                </span>
                {added ? (
                  <span className="font-medium text-foreground tabular-nums">
                    {t("investments.allocationTargets.add", {
                      amount: money.format(added / 100, currency),
                      share: percent.format(shareAfter(row.value, added)),
                    })}
                  </span>
                ) : null}
              </p>
            </ShareRow>
          );
        })}
      </ul>
      <FieldShell
        id={`${id}-amount`}
        label={t("investments.allocationTargets.amount")}
        error={error}
        className="w-full sm:w-56"
      >
        <Input
          id={`${id}-amount`}
          inputMode="decimal"
          value={amount}
          {...shellAria({ id: `${id}-amount`, error })}
          onChange={(event) => setAmount(event.target.value)}
        />
      </FieldShell>
      {valid ? (
        <p role="status" className="text-sm">
          {t("investments.allocationTargets.splitNote", {
            amount: money.format(Number(normalizeMoney(amount)), currency),
          })}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {t("investments.allocationTargets.disclaimer")}
      </p>
    </div>
  );
}
