import { useTranslation } from "react-i18next";
import { useGetNetWorthHistorySuspense } from "@/api/generated";
import { useMoney } from "@/hooks/use-formatters";

interface Props {
  dateFrom: string;
  dateTo: string;
}

export function NetWorthChangeCard({ dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const history = useGetNetWorthHistorySuspense();

  const items = (history.data?.items ?? [])
    .filter((item) => (item.date ?? "") >= dateFrom && (item.date ?? "") <= dateTo)
    .toSorted((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  if (items.length < 2) {
    return (
      <section className="section">
        <h2 className="section-title">{t("reports.netWorthChange")}</h2>
        <p className="py-6 text-sm text-muted-foreground">
          {t("reports.notEnoughNetWorthHistory")}
        </p>
      </section>
    );
  }

  const start = Number(items[0]!.netWorth ?? 0);
  const end = Number(items.at(-1)!.netWorth ?? 0);
  const change = end - start;

  return (
    <section className="section">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="section-title">{t("reports.netWorthChange")}</h2>
        <p
          className={`text-xl font-semibold whitespace-nowrap tabular-nums ${change >= 0 ? "text-income" : "text-expense"}`}
        >
          {money.formatSigned(change)}
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums sm:text-right">
        {money.format(start)} → {money.format(end)}
      </p>
    </section>
  );
}
