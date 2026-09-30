import { ShareRow } from "@/components/share-row/share-row";
import { useMoney, usePercent } from "@/hooks/use-formatters";
import { shareOf } from "@/lib/share";

interface ShareBarRow {
  id: string;
  name: string;
  amount: number;
  detail?: string;
}

interface Props {
  rows: readonly ShareBarRow[];
  currency?: string;
}

export function ShareBars({ rows, currency }: Readonly<Props>) {
  const money = useMoney();
  const percent = usePercent();

  const shares = shareOf(
    rows.map((row) => row.amount),
    (fraction) => percent.format(fraction),
  );

  return (
    <ul className="space-y-3.5">
      {rows.map((row) => (
        <ShareRow
          key={row.id}
          name={
            <span className="min-w-0 flex-1 truncate" title={row.name}>
              {row.name}
              {row.detail ? (
                <span className="ml-2 text-xs text-muted-foreground">{row.detail}</span>
              ) : null}
            </span>
          }
          share={shares.share(row.amount)}
          amount={money.format(row.amount, currency)}
          wideAmount
          value={Math.abs(row.amount)}
          max={shares.max}
          tone={row.amount < 0 ? "negative" : "primary"}
        />
      ))}
    </ul>
  );
}
