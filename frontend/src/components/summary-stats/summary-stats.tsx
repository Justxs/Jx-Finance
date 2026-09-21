import type { ReactNode } from "react";
import { Panel } from "@/components/ui/section/section";
import { SplitColumns } from "@/components/ui/split-columns/split-columns";
import { EMPTY_VALUE, type MoneySign, useMoney } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

interface SummaryStat {
  label: string;
  value: string | undefined;
  tone?: string;
  lead?: boolean;
  sign?: MoneySign;
  note?: ReactNode;
}

interface Props {
  items: readonly SummaryStat[];
  currency?: string;
}

export function SummaryStats({ items, currency }: Readonly<Props>) {
  const money = useMoney();
  const lead = items.find((item) => item.lead) ?? items[0];
  const rest = items.filter((item) => item !== lead);

  function formatValue(item: SummaryStat) {
    if (item.value === undefined) {
      return EMPTY_VALUE;
    }

    const amount = Number(item.value);
    return item.sign
      ? money.formatSigned(amount, item.sign, currency)
      : money.format(amount, currency);
  }

  return (
    <Panel as={SplitColumns} className="gap-y-6 lg:items-end">
      {lead ? (
        <dl className="min-w-0">
          <dt className="text-sm text-muted-foreground">{lead.label}</dt>
          <dd
            className={cn(
              "mt-1 max-w-full font-serif text-stat font-semibold wrap-break-word lining-nums tabular-nums",
              lead.tone,
            )}
          >
            {formatValue(lead)}
          </dd>
          {lead.note ? <dd className="mt-1.5">{lead.note}</dd> : null}
        </dl>
      ) : null}
      <dl
        className={cn(
          "grid min-w-0 gap-x-8 gap-y-4",
          rest.length === 4
            ? "grid-cols-2"
            : "grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))]",
        )}
      >
        {rest.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd
              className={cn("mt-0.5 text-xl font-semibold wrap-break-word tabular-nums", item.tone)}
            >
              {formatValue(item)}
            </dd>
            {item.note ? <dd className="mt-1">{item.note}</dd> : null}
          </div>
        ))}
      </dl>
    </Panel>
  );
}
