import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardLayoutSuspense } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button, buttonVariants } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Section } from "@/components/ui/section/section";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { MonthClosePrompt } from "@/features/month-close/month-close-prompt/month-close-prompt";
import { MonthCloseReview } from "@/features/month-close/month-close-review/month-close-review";
import { shiftMonth } from "@/features/month-close/month-key";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useMonthName } from "@/hooks/use-formatters";
import { useSettingsSuspense, useTodayDate } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { DashboardCard } from "../dashboard-card/dashboard-card";
import { shownCards } from "../dashboard-layout";
import { currentMonthKey } from "../dashboard-queries";
import { DashboardSkeleton, dashboardGrid } from "./dashboard-pending";

const MONTH_STEP_WAIT = 300;

interface ContentProps {
  month: string;
}

function DashboardContent({ month }: Readonly<ContentProps>) {
  const { t } = useTranslation();
  const layout = useDashboardLayoutSuspense().data;
  const { features } = useSettingsSuspense();
  const cards = shownCards(layout, features);

  if (cards.length === 0) {
    return (
      <Section as="div" className="flex flex-wrap items-center justify-between gap-3">
        <EmptyText>{t("dashboard.layout.allHidden")}</EmptyText>
        <Link
          to="/profile"
          search={{ section: "dashboard" }}
          className={buttonVariants({ variant: "outline" })}
        >
          <SlidersHorizontal />
          {t("dashboard.layout.chooseCards")}
        </Link>
      </Section>
    );
  }

  return (
    <div className={dashboardGrid}>
      {cards.map((card) => (
        <DashboardCard
          key={card}
          card={card}
          month={month}
          widen={card === "spendingByCategory" && !cards.includes("spendingPace")}
        />
      ))}
    </div>
  );
}

interface MonthHeaderProps {
  month: string;
  current: string;
  onChange: (month: string) => void;
}

function MonthHeader({ month, current, onChange }: Readonly<MonthHeaderProps>) {
  const { t } = useTranslation();
  const monthName = useMonthName();
  const next = shiftMonth(month, 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h1
        aria-live="polite"
        className="min-w-0 font-serif text-stat-lg font-semibold wrap-break-word lining-nums first-letter:uppercase"
      >
        {monthName(month)}
      </h1>
      <nav aria-label={t("dashboard.month.label")} className="flex items-center gap-1">
        <span
          className={cn(
            "transition-all duration-200 ease-out-expo motion-reduce:transition-none",
            month === current && "invisible translate-x-2 opacity-0",
          )}
        >
          <Button type="button" variant="outline" onClick={() => onChange(current)}>
            {t("dashboard.month.current")}
          </Button>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("dashboard.month.previous")}
          onClick={() => onChange(shiftMonth(month, -1))}
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("dashboard.month.next")}
          disabled={next > current}
          onClick={() => onChange(next)}
        >
          <ChevronRight />
        </Button>
      </nav>
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" });
  const current = currentMonthKey(useTodayDate());
  const month = search.month ?? current;
  const [shown, stale] = useDeferredParams({ month });

  function choose(next: string) {
    void navigate({ search: { month: next === current ? undefined : next } });
  }

  const stepped = useDebouncedDraft(month, choose, MONTH_STEP_WAIT);

  return (
    <div className="space-y-6">
      <MonthHeader month={stepped.draft} current={current} onChange={stepped.change} />

      <StaleRegion stale={stale} className="space-y-6">
        {shown.month === current ? <MonthClosePrompt /> : <MonthCloseReview month={shown.month} />}

        <QueryBoundary
          fallback={<DashboardSkeleton />}
          errorSubject={t("dashboard.layout.subject")}
        >
          <DashboardContent month={shown.month} />
        </QueryBoundary>
      </StaleRegion>
    </div>
  );
}
