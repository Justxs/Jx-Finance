import { useTranslation } from "react-i18next";
import { useMonthReviewSuspense } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { useFeature } from "@/hooks/use-settings";
import { CloseForm } from "../close-form/close-form";
import { DriftPanel } from "../drift-panel/drift-panel";
import { MonthCloseReviewSkeleton } from "./month-close-review-skeleton";

interface Props {
  month: string;
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
    <QueryBoundary fallback={<MonthCloseReviewSkeleton />} errorSubject={t("monthClose.title")}>
      <Review month={month} />
    </QueryBoundary>
  );
}
