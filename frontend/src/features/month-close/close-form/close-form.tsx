import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useReopenMonth, useUpdateMonthNote } from "@/api/generated";
import type { MonthReviewResponse } from "@/api/generated/model";
import { BudgetRows } from "@/components/budget-rows/budget-rows";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { FormError } from "@/components/form-error/form-error";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { Button } from "@/components/ui/button/button";
import { Section, TitledSection } from "@/components/ui/section/section";
import { SplitColumns } from "@/components/ui/split-columns/split-columns";
import { openItemCount } from "@/features/month-close/close-checklist/close-checklist";
import { keptShare } from "@/features/month-close/kept-share";
import {
  MonthNoteDialog,
  NoteForm,
} from "@/features/month-close/month-note-dialog/month-note-dialog";
import { useMoney, useMonthName, usePercent } from "@/hooks/use-formatters";
import { isClosedStatus } from "@/lib/month-close";
import { silentMutation } from "@/lib/mutations";
import { gainTone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { useMonthCloser } from "./use-month-closer";

function MonthNote({ note }: Readonly<{ note: string }>) {
  const { t } = useTranslation();

  return (
    <p className="text-sm wrap-break-word whitespace-pre-line">
      <span className="text-muted-foreground">{t("monthClose.form.note")}: </span>
      {note}
    </p>
  );
}

function MonthFigures({ review }: Readonly<{ review: MonthReviewResponse }>) {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();
  const { figures, netWorthStart, netWorthEnd } = review;
  const share = keptShare(figures.totalIncome, figures.net);
  const budgets = review.budgets ?? [];
  const beside = budgets.length > 0;

  return (
    <SplitColumns className={cn("gap-y-6", beside && "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]")}>
      <TitledSection title={t("monthClose.page.figures")} bodyGap="sm">
        <SummaryStats
          className={beside ? "lg:grid-cols-1" : undefined}
          items={[
            { label: t("monthClose.figures.net"), value: figures.net, sign: "auto", lead: true },
            {
              label: t("monthClose.figures.income"),
              value: figures.totalIncome,
              sign: "+",
              tone: gainTone(Number(figures.totalIncome), "+"),
            },
            {
              label: t("monthClose.figures.expense"),
              value: figures.totalExpense,
              sign: "−",
              tone: gainTone(Number(figures.totalExpense), "−"),
            },
            ...(share
              ? [
                  {
                    label: t(share.kept ? "monthClose.figures.kept" : "monthClose.figures.spent"),
                    value: undefined,
                    text: percent.format(share.share),
                  },
                ]
              : []),
            ...(netWorthStart && netWorthEnd
              ? [
                  {
                    label: t("nav.netWorth"),
                    value: undefined,
                    text: `${money.format(Number(netWorthStart.netWorth))} → ${money.format(Number(netWorthEnd.netWorth))}`,
                  },
                ]
              : []),
          ]}
        />
      </TitledSection>
      {beside ? (
        <TitledSection title={t("nav.budgets")} bodyGap="sm">
          <BudgetRows budgets={budgets} ended={review.status !== "notEnded"} />
        </TitledSection>
      ) : null}
    </SplitColumns>
  );
}

interface Props {
  month: string;
  review: MonthReviewResponse;
}

export function CloseForm({ month, review }: Readonly<Props>) {
  const { t } = useTranslation();
  const monthName = useMonthName()(month);
  const [editing, setEditing] = useState<"reclose" | "note" | null>(null);
  const [confirmingReopen, setConfirmingReopen] = useState(false);
  const [closingWith, setClosingWith] = useState<{ note: string } | null>(null);
  const closed = isClosedStatus(review.status);
  const openItems = openItemCount(review.checklist);

  const closer = useMonthCloser(month, review);
  const noteMutation = useUpdateMonthNote({
    mutation: {
      ...silentMutation,
      onSuccess: () => {
        toast.success(t("monthClose.form.noteSaved"));
        setEditing(null);
      },
    },
  });
  const reopenMutation = useReopenMonth({
    mutation: {
      ...silentMutation,
      onSuccess: () => toast.success(t("monthClose.form.reopened", { month: monthName })),
    },
  });

  const closeLabel = t("monthClose.form.closeMonth", { month: monthName });
  const recloseLabel = t("monthClose.form.reclose");
  const noteLabel = review.note ? t("monthClose.form.editNote") : t("monthClose.form.addNote");

  function close(note: string) {
    if (openItems > 0) {
      setClosingWith({ note });
      return Promise.resolve();
    }
    return closer.mutateAsync({ month, data: { note } });
  }

  function stopEditing() {
    setEditing(null);
    closer.reset();
    noteMutation.reset();
  }

  return (
    <Section as="div">
      <div className={cn("space-y-5", closed && "border-b-3 border-double border-rule pb-5")}>
        <MonthFigures review={review} />
        {closed && review.note ? <MonthNote note={review.note} /> : null}
      </div>

      {review.status === "open" ? (
        <div className="mt-5 border-t pt-5">
          <NoteForm
            note=""
            submitLabel={closeLabel}
            pending={closer.isPending}
            error={closer.error}
            onSubmit={close}
          />
        </div>
      ) : null}

      {review.status === "notEnded" ? (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t pt-5">
          <p className="text-sm text-muted-foreground">{t("monthClose.panel.notEnded")}</p>
          <Button type="button" disabled>
            {closeLabel}
          </Button>
        </div>
      ) : null}

      {closed ? (
        <div className="mt-5 flex flex-wrap justify-end gap-2 print:hidden">
          <Button
            type="button"
            variant="outline-destructive"
            pending={reopenMutation.isPending}
            onClick={() => setConfirmingReopen(true)}
          >
            {t("monthClose.form.reopen")}
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditing("note")}>
            {noteLabel}
          </Button>
          {review.status === "closedChanged" ? (
            <Button type="button" onClick={() => setEditing("reclose")}>
              {recloseLabel}
            </Button>
          ) : null}
        </div>
      ) : null}

      <FormError error={reopenMutation.error} />

      <ConfirmDeleteDialog
        target={closingWith}
        title={t("monthClose.form.confirmTitle")}
        description={t("monthClose.form.confirmDescription", { count: openItems })}
        confirmLabel={t("monthClose.form.closeAnyway")}
        destructive={false}
        onCancel={() => setClosingWith(null)}
        onConfirm={({ note }) => {
          setClosingWith(null);
          closer.mutate({ month, data: { note } });
        }}
      />
      <MonthNoteDialog
        open={editing === "reclose"}
        title={recloseLabel}
        description={t("monthClose.form.recloseHint")}
        note={review.note ?? ""}
        submitLabel={recloseLabel}
        pending={closer.isPending}
        error={closer.error}
        onSubmit={(note) =>
          closer.mutateAsync({ month, data: { note } }).then(() => setEditing(null))
        }
        onClose={stopEditing}
      />
      <MonthNoteDialog
        open={editing === "note"}
        title={noteLabel}
        note={review.note ?? ""}
        submitLabel={t("monthClose.form.saveNote")}
        pending={noteMutation.isPending}
        error={noteMutation.error}
        onSubmit={(note) => noteMutation.mutateAsync({ month, data: { note } })}
        onClose={stopEditing}
      />
      <ConfirmDeleteDialog
        target={confirmingReopen ? true : null}
        title={t("monthClose.form.reopenTitle", { month: monthName })}
        description={t("monthClose.form.reopenDescription")}
        confirmLabel={t("monthClose.form.reopen")}
        onCancel={() => setConfirmingReopen(false)}
        onConfirm={() => {
          setConfirmingReopen(false);
          reopenMutation.mutate({ month });
        }}
      />
    </Section>
  );
}
