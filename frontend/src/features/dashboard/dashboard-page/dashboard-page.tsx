import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDashboardLayoutSuspense } from "@/api/generated";
import { PageHeader } from "@/components/page-header/page-header";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Panel } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { useDateFormat } from "@/hooks/use-formatters";
import { useSettingsSuspense, useTodayDate } from "@/hooks/use-settings";
import { DashboardCard } from "../dashboard-card/dashboard-card";
import { DashboardCustomiser } from "../dashboard-customiser/dashboard-customiser";
import { shownCards } from "../dashboard-layout";

const grid = "grid gap-4 lg:grid-cols-6 xl:grid-cols-12 xl:gap-5";

function DashboardSkeleton() {
  return (
    <div className={grid}>
      <Skeleton className="h-72 w-full rounded-lg lg:col-span-6 xl:col-span-4" />
      <Skeleton className="h-72 w-full rounded-lg lg:col-span-6 xl:col-span-8" />
    </div>
  );
}

interface ContentProps {
  customising: boolean;
  onCustomise: () => void;
  onDone: () => void;
}

function DashboardContent({ customising, onCustomise, onDone }: Readonly<ContentProps>) {
  const { t } = useTranslation();
  const layout = useDashboardLayoutSuspense().data;
  const { features } = useSettingsSuspense();

  if (customising) {
    return <DashboardCustomiser layout={layout} features={features} onDone={onDone} />;
  }

  const cards = shownCards(layout, features);

  if (cards.length === 0) {
    return (
      <Panel className="flex flex-wrap items-center justify-between gap-3">
        <EmptyText>{t("dashboard.layout.allHidden")}</EmptyText>
        <Button variant="outline" onClick={onCustomise}>
          <SlidersHorizontal />
          {t("dashboard.layout.chooseCards")}
        </Button>
      </Panel>
    );
  }

  return (
    <div className={grid}>
      {cards.map((card) => (
        <DashboardCard key={card} card={card} />
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const month = useDateFormat({ month: "long", year: "numeric" }).format(useTodayDate());
  const [customising, setCustomising] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.title")} description={month}>
        {customising ? null : (
          <Button variant="outline" onClick={() => setCustomising(true)}>
            <SlidersHorizontal />
            {t("dashboard.layout.customise")}
          </Button>
        )}
      </PageHeader>

      <QueryBoundary fallback={<DashboardSkeleton />} errorSubject={t("dashboard.layout.subject")}>
        <DashboardContent
          customising={customising}
          onCustomise={() => setCustomising(true)}
          onDone={() => setCustomising(false)}
        />
      </QueryBoundary>
    </div>
  );
}
