import { useTranslation } from "react-i18next";
import { useMonthReviewSuspense } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Section } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { useFeature } from "@/hooks/use-settings";
import { CloseForm } from "../close-form/close-form";
import { DriftPanel } from "../drift-panel/drift-panel";

interface Props {
  month: string;
}

function ReviewSkeleton() {
  return (
    <Section aria-hidden="true" className="flex flex-wrap items-start gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
        <Skeleton className="mt-1 size-5 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-56 max-w-full rounded-sm" />
          <Skeleton className="h-4 w-40 max-w-full rounded-sm" />
        </div>
      </div>
      <div className="ml-auto flex gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="size-9" />
      </div>
    </Section>
  );
}

function Review({ month }: Readonly<Props>) {
  const review = useMonthReviewSuspense(month).data;

  return (
    <>
      <CloseForm key={`${month}-${review.closedAt ?? ""}`} month={month} review={review} />
      {review.status === "closedChanged" && review.drift ? (
        <DriftPanel drift={review.drift} figures={review.figures} />
      ) : null}
    </>
  );
}

export function MonthCloseReview({ month }: Readonly<Props>) {
  const { t } = useTranslation();
  const enabled = useFeature("monthClose");

  if (!enabled) {
    return null;
  }

  return (
    <QueryBoundary fallback={<ReviewSkeleton />} errorSubject={t("monthClose.title")}>
      <Review month={month} />
    </QueryBoundary>
  );
}
