import { Skeleton } from "@/components/ui/skeleton";
import { useMoney } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

interface SummaryStat {
  label: string;
  value: string | undefined;
  tone?: string;
}

interface Props {
  items: readonly SummaryStat[];
  pending?: boolean;
}

export function SummaryStats({ items, pending }: Readonly<Props>) {
  const money = useMoney();

  function formatValue(value: string | undefined) {
    return value === undefined ? "—" : money.format(Number(value));
  }

  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-px overflow-hidden rounded-md border bg-border">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 bg-card p-5">
          <dt className="text-sm font-medium text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "mt-2 break-words text-2xl font-semibold tabular-nums tracking-tight",
              item.tone,
            )}
          >
            {pending ? <Skeleton className="h-8 w-24" /> : formatValue(item.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
