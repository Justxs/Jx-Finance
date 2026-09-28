import type { ReactNode } from "react";
import { Section } from "@/components/ui/section/section";
import { TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { SplitColumns } from "@/components/ui/split-columns/split-columns";
import { EMPTY_VALUE, type MoneySign, useMoney } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

interface SummaryStat {
  label: string;
  value: string | undefined;
  text?: string;
  tone?: string;
  lead?: boolean;
  sign?: MoneySign;
  note?: ReactNode;
}

interface Props {
  items: readonly SummaryStat[];
  currency?: string;
}

function restGrid(count: number) {
  return cn(
    "grid min-w-0 gap-x-8 gap-y-4",
    count === 4 ? "grid-cols-2" : "grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))]",
  );
}

export function SummaryStats({ items, currency }: Readonly<Props>) {
  const money = useMoney();
  const lead = items.find((item) => item.lead) ?? items[0];
  const rest = items.filter((item) => item !== lead);

  function formatValue(item: SummaryStat) {
    if (item.text !== undefined) {
      return item.text;
    }
    if (item.value === undefined) {
      return EMPTY_VALUE;
    }

    const amount = Number(item.value);
    return item.sign
      ? money.formatSigned(amount, item.sign, currency)
      : money.format(amount, currency);
  }

  return (
    <Section as={SplitColumns} className="gap-y-6 lg:items-end">
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
      <dl className={restGrid(rest.length)}>
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
    </Section>
  );
}

export function SummaryStatsSkeleton({ items = 2 }: Readonly<{ items?: number }>) {
  return (
    <Section
      as={SplitColumns}
      data-slot="summary-stats-skeleton"
      aria-hidden="true"
      className="gap-y-6 lg:items-end"
    >
      <div className="min-w-0">
        <TextSkeleton size="sm" />
        <TextSkeleton size="stat" className="mt-1" width="w-52" />
      </div>
      <div className={restGrid(items)}>
        {Array.from({ length: items }, (_, index) => (
          <div key={index} className="min-w-0">
            <TextSkeleton size="sm" width="w-28" />
            <TextSkeleton size="xl" className="mt-0.5" />
          </div>
        ))}
      </div>
    </Section>
  );
}
