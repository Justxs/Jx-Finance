import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMonthReviewSuspense } from "@/api/generated";
import type { MonthReviewResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { FormError } from "@/components/form-error/form-error";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button, buttonVariants } from "@/components/ui/button/button";
import { Section, SectionTitle } from "@/components/ui/section/section";
import {
  CloseChecklist,
  attentionCount,
  openItemCount,
} from "@/features/month-close/close-checklist/close-checklist";
import { useMonthCloser } from "@/features/month-close/close-form/use-month-closer";
import { statusMarkers } from "@/features/month-close/status-markers";
import { useMoney, useMonthName, usePercent } from "@/hooks/use-formatters";
import { useFeature, useTodayDate } from "@/hooks/use-settings";
import { latestEndedMonth } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { hideMonthClosePrompt, useMonthClosePromptHidden } from "@/stores/month-close-prompt-store";

function savingsRate(income: string | undefined, net: string | undefined) {
  const earned = Number(income ?? 0);
  return earned > 0 ? Number(net ?? 0) / earned : null;
}

interface PanelProps {
  month: string;
  review: MonthReviewResponse;
}

function PromptPanel({ month, review }: Readonly<PanelProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const money = useMoney();
  const percent = usePercent();
  const monthName = useMonthName()(month);
  const closer = useMonthCloser(month, review);
  const [confirming, setConfirming] = useState(false);
  const changed = review.status === "closedChanged";
  const attention = attentionCount(review.checklist);
  const openItems = openItemCount(review.checklist);
  const marker = statusMarkers[review.status];
  const rate = savingsRate(review.figures.totalIncome, review.figures.net);

  let summary = t("monthClose.prompt.ready");
  if (changed) {
    summary = t("monthClose.prompt.changed");
  } else if (attention > 0) {
    summary = t("monthClose.panel.attention", { count: attention });
  }

  function close() {
    setConfirming(false);
    closer.mutate({ month, data: { note: "" } });
  }

  const reviewLink = (
    <Link
      to="/"
      search={{ month }}
      className={buttonVariants({ variant: changed ? "default" : "outline" })}
    >
      {t("monthClose.prompt.review")}
    </Link>
  );

  return (
    <Section aria-labelledby={titleId}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-start gap-3">
          <marker.icon aria-hidden="true" className={cn("mt-1 size-5 shrink-0", marker.tone)} />
          <div className="min-w-0">
            <SectionTitle id={titleId}>
              {t(
                changed ? "monthClose.prompt.title.closedChanged" : "monthClose.prompt.title.open",
                {
                  month: monthName,
                },
              )}
            </SectionTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">{summary}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          tooltip={t("monthClose.prompt.hideLabel")}
          onClick={() => hideMonthClosePrompt(month)}
        >
          {t("monthClose.prompt.hide")}
        </Button>
      </div>

      <div className="mt-3 grid gap-x-12 gap-y-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        {changed || attention === 0 ? (
          <div />
        ) : (
          <CloseChecklist month={month} checklist={review.checklist} openOnly />
        )}

        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 lg:justify-end">
          <dl className="flex gap-x-8">
            <div>
              <dt className="text-xs text-muted-foreground">{t("monthClose.prompt.net")}</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {money.formatSigned(Number(review.figures.net), "auto")}
              </dd>
            </div>
            {rate === null ? null : (
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("monthClose.prompt.savingsRate")}
                </dt>
                <dd className="text-xl font-semibold tabular-nums">{percent.format(rate)}</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-2">
            {reviewLink}
            {changed ? null : (
              <Button
                pending={closer.isPending}
                onClick={() => (openItems > 0 ? setConfirming(true) : close())}
              >
                {t("monthClose.form.closeMonth", { month: monthName })}
              </Button>
            )}
          </div>
        </div>
      </div>

      <FormError error={closer.error} />
      <ConfirmDeleteDialog
        target={confirming ? true : null}
        title={t("monthClose.form.confirmTitle")}
        description={t("monthClose.form.confirmDescription", { count: openItems })}
        confirmLabel={t("monthClose.form.closeAnyway")}
        destructive={false}
        onCancel={() => setConfirming(false)}
        onConfirm={close}
      />
    </Section>
  );
}

function Prompt({ month }: Readonly<{ month: string }>) {
  const review = useMonthReviewSuspense(month).data;
  if (review.status !== "open" && review.status !== "closedChanged") {
    return null;
  }
  return <PromptPanel month={month} review={review} />;
}

export function MonthClosePrompt() {
  const enabled = useFeature("monthClose");
  const month = latestEndedMonth(useTodayDate());
  const hidden = useMonthClosePromptHidden(month);

  if (!enabled || hidden) {
    return null;
  }

  return (
    <QueryBoundary fallback={null} error={null}>
      <Prompt month={month} />
    </QueryBoundary>
  );
}
