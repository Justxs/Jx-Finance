import { TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGetNetWorthHistoryEndpoint } from "@/api/generated";
import { useMoney } from "@/hooks/use-formatters";

interface Props {
  dateFrom: string;
  dateTo: string;
}

export function NetWorthChangeCard({ dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const history = useGetNetWorthHistoryEndpoint();

  const items = (history.data?.items ?? [])
    .filter((item) => (item.date ?? "") >= dateFrom && (item.date ?? "") <= dateTo)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  if (items.length < 2) {
    return (
      <p className="px-6 py-8 text-sm text-muted-foreground">
        {t("reports.notEnoughNetWorthHistory")}
      </p>
    );
  }

  const start = Number(items[0]!.netWorth ?? 0);
  const end = Number(items[items.length - 1]!.netWorth ?? 0);
  const change = end - start;
  const Icon = change >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="card flex flex-wrap items-start justify-between gap-3 p-6">
      <div className="min-w-0 break-words">
        <p className="text-sm font-medium text-muted-foreground">{t("reports.netWorthChange")}</p>
        <p
          className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${change >= 0 ? "text-secondary" : "text-destructive"}`}
        >
          {change >= 0 ? "+" : ""}
          {money.format(change)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {money.format(start)} → {money.format(end)}
        </p>
      </div>
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
          change >= 0 ? "bg-secondary/15 text-secondary" : "bg-destructive/10 text-destructive"
        }`}
      >
        <Icon className="size-5" />
      </span>
    </div>
  );
}
