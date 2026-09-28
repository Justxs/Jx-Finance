import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCloseMonth } from "@/api/generated";
import type { MonthReviewResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { useMonthName } from "@/hooks/use-formatters";
import { silent } from "@/lib/mutations";
import { openItemCount } from "../close-checklist/close-checklist";
import { isClosedStatus } from "../month-key";

export function useMonthCloser(month: string, review: MonthReviewResponse, onClosed?: () => void) {
  const { t } = useTranslation();
  const monthName = useMonthName()(month);
  const [pendingNote, setPendingNote] = useState<string | null>(null);
  const closed = isClosedStatus(review.status);
  const openItems = openItemCount(review.checklist);

  const mutation = useCloseMonth(
    silent({
      onSuccess: () => {
        toast.success(
          t(closed ? "monthClose.form.reclosed" : "monthClose.form.closed", { month: monthName }),
        );
        onClosed?.();
      },
    }),
  );

  function close(note: string) {
    return mutation.mutateAsync({ month, data: { note } });
  }

  function request(note: string) {
    if (!closed && openItems > 0) {
      setPendingNote(note);
      return Promise.resolve();
    }
    return close(note);
  }

  const dialog = (
    <ConfirmDeleteDialog
      target={pendingNote}
      title={t("monthClose.form.confirmTitle")}
      description={t("monthClose.form.confirmDescription", { count: openItems })}
      confirmLabel={t("monthClose.form.closeAnyway")}
      destructive={false}
      onCancel={() => setPendingNote(null)}
      onConfirm={(note) => {
        setPendingNote(null);
        mutation.mutate({ month, data: { note } });
      }}
    />
  );

  return {
    request,
    dialog,
    pending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
