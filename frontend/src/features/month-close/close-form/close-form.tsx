import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useReopenMonth, useUpdateMonthNote } from "@/api/generated";
import type { MonthReviewResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { useDateTime, useMonthName } from "@/hooks/use-formatters";
import { silent } from "@/lib/mutations";
import { cn } from "@/lib/utils";
import { CloseChecklist, attentionCount } from "../close-checklist/close-checklist";
import { isClosedStatus } from "../month-key";
import { statusMarkers } from "../month-picker/month-picker";
import { useMonthCloser } from "./use-month-closer";

const NOTE_MAX_LENGTH = 1000;

interface Props {
  month: string;
  review: MonthReviewResponse;
}

export function CloseForm({ month, review }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const monthName = useMonthName()(month);
  const dateTime = useDateTime();
  const [confirmingReopen, setConfirmingReopen] = useState(false);
  const closed = isClosedStatus(review.status);
  const attention = attentionCount(review.checklist, review.monthEnd);
  const navigate = useNavigate();
  const marker = statusMarkers[review.status];

  function stayOnMonth() {
    void navigate({ to: "/close", search: { month }, replace: true });
  }

  const closer = useMonthCloser(month, review, stayOnMonth);
  const noteMutation = useUpdateMonthNote(
    silent({ onSuccess: () => toast.success(t("monthClose.form.noteSaved")) }),
  );
  const reopenMutation = useReopenMonth(
    silent({
      onSuccess: () => {
        toast.success(t("monthClose.form.reopened", { month: monthName }));
        stayOnMonth();
      },
    }),
  );

  const form = useServerForm({
    defaultValues: { note: review.note ?? "" },
    schema: z.object({ note: z.string().max(NOTE_MAX_LENGTH) }),
    submit: (value) =>
      review.status === "closed"
        ? noteMutation.mutateAsync({ month, data: { note: value.note } })
        : closer.request(value.note),
  });

  const summary = {
    notEnded: t("monthClose.panel.notEnded"),
    open:
      attention === 0
        ? t("monthClose.panel.ready")
        : t("monthClose.panel.attention", { count: attention }),
    closed: t("monthClose.panel.closedOn", { date: dateTime(review.closedAt) }),
    closedChanged: t("monthClose.panel.changedSince", { date: dateTime(review.closedAt) }),
  }[review.status];

  return (
    <Section aria-labelledby={titleId}>
      <div className="flex items-start gap-3">
        <marker.icon aria-hidden="true" className={cn("mt-1 size-5 shrink-0", marker.tone)} />
        <div className="min-w-0">
          <SectionTitle id={titleId}>
            {t(`monthClose.panel.title.${review.status}`, { month: monthName })}
          </SectionTitle>
          <p
            role="status"
            className={cn(
              "mt-0.5 text-sm",
              review.status === "closedChanged"
                ? "font-medium text-expense"
                : "text-muted-foreground",
            )}
          >
            {summary}
          </p>
        </div>
      </div>

      <CloseChecklist month={month} checklist={review.checklist} className="mt-4" />

      {review.status === "notEnded" ? null : (
        <form.AppForm>
          <form.FormShell className="mt-4 space-y-4 border-t pt-4">
            <div className="max-w-xl">
              <form.Field name="note">
                {(field) => (
                  <field.TextField
                    id="month-close-note"
                    label={t("monthClose.form.note")}
                    hint={t("monthClose.form.noteHint")}
                    maxLength={NOTE_MAX_LENGTH}
                    autoComplete="off"
                  />
                )}
              </form.Field>
            </div>
            <FormError error={closer.error ?? noteMutation.error ?? reopenMutation.error} />
            <div className="flex flex-wrap items-center justify-end gap-2">
              {closed ? (
                <Button
                  type="button"
                  variant="ghost-destructive"
                  pending={reopenMutation.isPending}
                  onClick={() => setConfirmingReopen(true)}
                >
                  {t("monthClose.form.reopen")}
                </Button>
              ) : null}
              {review.status === "closedChanged" ? (
                <Button
                  type="button"
                  variant="outline"
                  pending={noteMutation.isPending}
                  onClick={() =>
                    noteMutation.mutate({ month, data: { note: form.getFieldValue("note") } })
                  }
                >
                  {t("monthClose.form.saveNote")}
                </Button>
              ) : null}
              <form.SubmitButton
                variant={review.status === "closed" ? "outline" : "default"}
                pending={review.status === "closed" ? noteMutation.isPending : closer.pending}
              >
                {review.status === "closed"
                  ? t("monthClose.form.saveNote")
                  : t(closed ? "monthClose.form.reclose" : "monthClose.form.closeMonth", {
                      month: monthName,
                    })}
              </form.SubmitButton>
            </div>
          </form.FormShell>
        </form.AppForm>
      )}

      {closer.dialog}
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
