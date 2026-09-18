import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGetNetWorthHistoryEndpointSuspense } from "@/api/generated";
import { useMoney } from "@/hooks/use-formatters";

export function NetWorthHistoryChart() {
  const { t } = useTranslation();
  const money = useMoney();
  const history = useGetNetWorthHistoryEndpointSuspense();

  const items = history.data?.items ?? [];
  if (items.length < 2) {
    return <p className="py-8 text-sm text-muted-foreground">{t("netWorth.notEnoughHistory")}</p>;
  }

  const chartData = items.map((item) => ({
    date: item.date,
    netWorth: Number(item.netWorth ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <Tooltip
          formatter={(value) => money.format(Number(value ?? 0))}
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--card-foreground)",
          }}
        />
        <Line
          type="monotone"
          dataKey="netWorth"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
