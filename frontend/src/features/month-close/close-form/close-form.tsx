import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useCloseMonth, useReopenMonth, useUpdateMonthNote } from "@/api/generated";
import type { MonthReviewResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { TitledSection } from "@/components/ui/section/section";
import { useMonthName } from "@/hooks/use-formatters";
import { silent } from "@/lib/mutations";
import { openItemCount } from "../close-checklist/close-checklist";
import { isClosedStatus } from "../month-key";

const NOTE_MAX_LENGTH = 1000;

type Confirming = { kind: "close"; note: string } | { kind: "reopen" };

interface Props {
  month: string;
  review: MonthReviewResponse;
}

export function CloseForm({ month, review }: Readonly<Props>) {
  const { t } = useTranslation();
  const monthName = useMonthName()(month);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const reopening = confirming?.kind === "reopen";
  const closed = isClosedStatus(review.status);
  const openItems = openItemCount(review.checklist);
  const navigate = useNavigate();

  function stayOnMonth() {
    void navigate({ to: "/close", search: { month }, replace: true });
  }

  const closeMutation = useCloseMonth(
    silent({
      onSuccess: () => {
        toast.success(
          t(closed ? "monthClose.form.reclosed" : "monthClose.form.closed", { month: monthName }),
        );
        stayOnMonth();
      },
    }),
  );
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

  function close(note: string) {
    return closeMutation.mutateAsync({ month, data: { note } });
  }

  const form = useServerForm({
    defaultValues: { note: review.note ?? "" },
    schema: z.object({ note: z.string().max(NOTE_MAX_LENGTH) }),
    submit: (value) => {
      if (review.status === "closed") {
        return noteMutation.mutateAsync({ month, data: { note: value.note } });
      }
      if (!closed && openItems > 0) {
        setConfirming({ kind: "close", note: value.note });
        return Promise.resolve();
      }
      return close(value.note);
    },
  });

  if (review.status === "notEnded") {
    return (
      <TitledSection title={t("monthClose.form.title")}>
        <p className="mt-2 text-sm text-muted-foreground">{t("monthClose.form.notEnded")}</p>
      </TitledSection>
    );
  }

  const error = closeMutation.error ?? noteMutation.error ?? reopenMutation.error;

  return (
    <TitledSection
      title={t("monthClose.form.title")}
      description={review.status === "closedChanged" ? t("monthClose.form.recloseHint") : undefined}
    >
      <form.AppForm>
        <form.FormShell className="mt-4 space-y-4">
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
          <FormError error={error} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            {closed ? (
              <>
                <Button
                  type="button"
                  variant="ghost-destructive"
                  pending={reopenMutation.isPending}
                  onClick={() => setConfirming({ kind: "reopen" })}
                >
                  {t("monthClose.form.reopen")}
                </Button>
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
              </>
            ) : null}
            {review.status === "closed" ? null : (
              <form.SubmitButton pending={closeMutation.isPending}>
                {t(closed ? "monthClose.form.reclose" : "monthClose.form.close")}
              </form.SubmitButton>
            )}
          </div>
        </form.FormShell>
      </form.AppForm>

      <ConfirmDeleteDialog
        target={confirming}
        title={
          reopening
            ? t("monthClose.form.reopenTitle", { month: monthName })
            : t("monthClose.form.confirmTitle")
        }
        description={
          reopening
            ? t("monthClose.form.reopenDescription")
            : t("monthClose.form.confirmDescription", { count: openItems })
        }
        confirmLabel={reopening ? t("monthClose.form.reopen") : t("monthClose.form.closeAnyway")}
        destructive={reopening}
        onCancel={() => setConfirming(null)}
        onConfirm={(target) => {
          if (target.kind === "reopen") {
            reopenMutation.mutate({ month });
          } else {
            closeMutation.mutate({ month, data: { note: target.note } });
          }
        }}
      />
    </TitledSection>
  );
}
