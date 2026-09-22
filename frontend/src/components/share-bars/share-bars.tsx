import { ShareRow } from "@/components/breakdown-list/share-row";
import { useMoney, usePercent } from "@/hooks/use-formatters";

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

  const maximum = Math.max(...rows.map((row) => Math.abs(row.amount)), 0);
  const positiveTotal = rows.reduce((sum, row) => sum + Math.max(0, row.amount), 0);

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
          share={
            row.amount > 0 && positiveTotal > 0 ? percent.format(row.amount / positiveTotal) : null
          }
          amount={money.format(row.amount, currency)}
          wideAmount
          value={Math.abs(row.amount)}
          max={maximum}
          tone={row.amount < 0 ? "negative" : "primary"}
        />
      ))}
    </ul>
  );
}
