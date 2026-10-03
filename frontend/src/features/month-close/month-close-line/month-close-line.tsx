import { useTranslation } from "react-i18next";
import { useMonthReviewSuspense } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RuledLine } from "@/components/ui/ruled-line/ruled-line";
import { Skeleton, TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { TextLink } from "@/components/ui/text-link/text-link";
import { openLineCount } from "@/features/month-close/close-checklist/close-checklist";
import { monthTitleKey, statusMarkers, useStatusLine } from "@/features/month-close/status-markers";
import { useMonthName } from "@/hooks/use-formatters";
import { useFeature } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

interface Props {
  month: string;
}

const lineClass = "flex flex-wrap items-center gap-x-3 gap-y-1";

function Line({ month }: Readonly<Props>) {
  const { t } = useTranslation();
  const monthName = useMonthName()(month);
  const statusLine = useStatusLine();
  const review = useMonthReviewSuspense(month).data;
  const marker = statusMarkers[review.status];
  const titleKey = monthTitleKey(review.status, openLineCount(review.checklist));

  return (
    <RuledLine className={lineClass}>
      <marker.icon aria-hidden="true" className={cn("size-4 shrink-0", marker.tone)} />
      <span className="font-medium">
        {t(`monthClose.panel.title.${titleKey}`, { month: monthName })}
      </span>
      <span className="text-muted-foreground">{statusLine(review)}</span>
      <TextLink to="/reports/month" search={{ month }} className="ml-auto">
        {t("monthClose.prompt.review")}
      </TextLink>
    </RuledLine>
  );
}

export function MonthCloseLineSkeleton() {
  return (
    <RuledLine aria-hidden="true" className={lineClass}>
      <Skeleton className="size-4 shrink-0 rounded-full" />
      <TextSkeleton size="sm" width="w-48" />
      <TextSkeleton size="sm" width="w-32" />
      <TextSkeleton size="sm" className="ml-auto" width="w-24" />
    </RuledLine>
  );
}

export function MonthCloseLine({ month }: Readonly<Props>) {
  const enabled = useFeature("monthClose");

  if (!enabled) {
    return null;
  }

  return (
    <QueryBoundary fallback={<MonthCloseLineSkeleton />} error={null}>
      <Line month={month} />
    </QueryBoundary>
  );
}
