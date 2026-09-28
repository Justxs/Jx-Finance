import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useReopenMonth, useUpdateMonthNote } from "@/api/generated";
import type { MonthReviewResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { useDateTime, useMonthName } from "@/hooks/use-formatters";
import { silent } from "@/lib/mutations";
import { cn } from "@/lib/utils";
import { CloseChecklist, attentionCount, openItemCount } from "../close-checklist/close-checklist";
import { isClosedStatus } from "../month-key";
import { MonthNoteDialog } from "../month-note-dialog/month-note-dialog";
import { statusMarkers } from "../status-markers";
import { useMonthCloser } from "./use-month-closer";

interface Props {
  month: string;
  review: MonthReviewResponse;
}

export function CloseForm({ month, review }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const monthName = useMonthName()(month);
  const dateTime = useDateTime();
  const [editing, setEditing] = useState<"close" | "note" | null>(null);
  const [confirmingReopen, setConfirmingReopen] = useState(false);
  const closed = isClosedStatus(review.status);
  const attention = attentionCount(review.checklist, review.monthEnd);
  const openItems = openItemCount(review.checklist);
  const marker = statusMarkers[review.status];

  const closer = useMonthCloser(month, review);
  const noteMutation = useUpdateMonthNote(
    silent({
      onSuccess: () => {
        toast.success(t("monthClose.form.noteSaved"));
        setEditing(null);
      },
    }),
  );
  const reopenMutation = useReopenMonth(
    silent({
      onSuccess: () => toast.success(t("monthClose.form.reopened", { month: monthName })),
    }),
  );

  const summary = {
    notEnded: t("monthClose.panel.notEnded"),
    open:
      attention === 0
        ? t("monthClose.panel.ready")
        : t("monthClose.panel.attention", { count: attention }),
    closed: t("monthClose.panel.closedOn", { date: dateTime(review.closedAt) }),
    closedChanged: t("monthClose.panel.changedSince", { date: dateTime(review.closedAt) }),
  }[review.status];

  const closeLabel = t(closed ? "monthClose.form.reclose" : "monthClose.form.closeMonth", {
    month: monthName,
  });
  const noteLabel = review.note ? t("monthClose.form.editNote") : t("monthClose.form.addNote");

  function stopEditing() {
    setEditing(null);
    closer.reset();
    noteMutation.reset();
  }

  return (
    <Section aria-labelledby={titleId}>
      <Collapsible.Root defaultOpen={review.status !== "closed"}>
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
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
              {review.note ? (
                <p className="mt-2 text-sm wrap-break-word whitespace-pre-line">
                  <span className="text-muted-foreground">{t("monthClose.form.note")}: </span>
                  {review.note}
                </p>
              ) : null}
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {closed ? (
              <>
                <Button
                  type="button"
                  variant="ghost-destructive"
                  pending={reopenMutation.isPending}
                  onClick={() => setConfirmingReopen(true)}
                >
                  {t("monthClose.form.reopen")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing("note")}>
                  {noteLabel}
                </Button>
              </>
            ) : null}
            {review.status === "open" || review.status === "closedChanged" ? (
              <Button type="button" onClick={() => setEditing("close")}>
                {closeLabel}
              </Button>
            ) : null}
            <Collapsible.Trigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("monthClose.panel.details")}
                  className="data-panel-open:[&_svg]:rotate-180"
                />
              }
            >
              <ChevronDown className="transition-transform duration-200 ease-out-expo" />
            </Collapsible.Trigger>
          </div>
        </div>

        <FormError error={reopenMutation.error} />

        <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-all duration-200 ease-out-expo data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
          <CloseChecklist month={month} checklist={review.checklist} className="mt-4" />
        </Collapsible.Panel>
      </Collapsible.Root>

      <MonthNoteDialog
        open={editing === "close"}
        title={closeLabel}
        description={
          !closed && openItems > 0
            ? t("monthClose.form.confirmDescription", { count: openItems })
            : undefined
        }
        note={review.note ?? ""}
        submitLabel={closeLabel}
        pending={closer.pending}
        error={closer.error}
        onSubmit={(note) => closer.close(note).then(() => setEditing(null))}
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
