import { useTranslation } from "react-i18next";
import { useNetWorthHistorySuspense } from "@/api/generated";
import { ChangeBadge } from "@/components/change-badge/change-badge";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { useMoney } from "@/hooks/use-formatters";
import { changeOf } from "@/lib/comparison";

interface Props {
  dateFrom: string;
  dateTo: string;
}

export function NetWorthChangeCard({ dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const history = useNetWorthHistorySuspense();

  const items = history.data.items
    .filter((item) => (item.date ?? "") >= dateFrom && (item.date ?? "") <= dateTo)
    .toSorted((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  if (items.length < 2) {
    return (
      <Section>
        <SectionTitle>{t("reports.netWorthChange")}</SectionTitle>
        <EmptyText>{t("reports.notEnoughNetWorthHistory")}</EmptyText>
      </Section>
    );
  }

  const start = Number(items[0]?.netWorth ?? 0);
  const end = Number(items.at(-1)?.netWorth ?? 0);
  const change = changeOf(end, start);

  return (
    <Section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <SectionTitle>{t("reports.netWorthChange")}</SectionTitle>
        <ChangeBadge
          change={change}
          good="up"
          className="text-xl font-semibold whitespace-nowrap"
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums sm:text-right">
        {money.format(start)} → {money.format(end)}
      </p>
    </Section>
  );
}
