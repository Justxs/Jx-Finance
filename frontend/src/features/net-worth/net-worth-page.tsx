import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/page-header";
import { AssetsSection } from "./assets-section";
import { DebtsSection } from "./debts-section";
import { NetWorthHistoryChart } from "./net-worth-history-chart";
import { NetWorthStats } from "./net-worth-stats";

export function NetWorthPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader title={t("netWorth.title")} subtitle={t("netWorth.subtitle")} />

      <NetWorthStats />

      <section className="card p-6">
        <h2 className="mb-4 font-semibold">{t("netWorth.trend")}</h2>
        <NetWorthHistoryChart />
      </section>

      <AssetsSection />
      <DebtsSection />
    </div>
  );
}
