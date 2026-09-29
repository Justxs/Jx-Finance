import { useTranslation } from "react-i18next";
import { useDeleteReconciliation, useReconciliationsSuspense } from "@/api/generated";
import type { AccountResponse, ReconciliationResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { FormError } from "@/components/form-error/form-error";
import { EditModal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RecordRow, RecordRowsSkeleton } from "@/components/record-row/record-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { toCents } from "@/lib/money";
import { silent } from "@/lib/mutations";
import { INCOME_TONE } from "@/lib/tone";
import { ReconcileForm } from "./reconcile-form";

function EarlierReconciliations({ account }: Readonly<{ account: AccountResponse }>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const reconciliations = useReconciliationsSuspense(account.id).data;
  const deleteMutation = useDeleteReconciliation(silent());

  function label(reconciliation: ReconciliationResponse) {
    return `${formatDate(reconciliation.date)}, ${money.format(Number(reconciliation.balance), reconciliation.currency)}`;
  }

  function verdict(reconciliation: ReconciliationResponse) {
    const cents = toCents(reconciliation.difference);
    if (cents === 0) {
      return <span className={INCOME_TONE}>{t("accounts.reconcile.matches")}</span>;
    }
    return (
      <span className="font-medium text-expense">
        {t(cents > 0 ? "accounts.reconcile.more" : "accounts.reconcile.less", {
          amount: money.format(Math.abs(cents) / 100, reconciliation.currency),
        })}
      </span>
    );
  }

  const remove = useConfirmedDelete(
    {
      mutate: ({ id }) => deleteMutation.mutate({ id: account.id, reconciliationId: id }),
      isPending: deleteMutation.isPending,
      variables: deleteMutation.variables
        ? { id: deleteMutation.variables.reconciliationId }
        : undefined,
    },
    reconciliations,
    label,
  );

  if (reconciliations.length === 0) {
    return <EmptyText size="sm">{t("accounts.reconcile.noEarlier")}</EmptyText>;
  }

  return (
    <>
      <FormError error={deleteMutation.error} />
      <Rows>
        {reconciliations.map((reconciliation) => (
          <RecordRow
            key={reconciliation.id}
            title={formatDate(reconciliation.date)}
            subtitle={t(`accounts.reconcile.source.${reconciliation.source}`)}
            note={verdict(reconciliation)}
            amount={money.format(Number(reconciliation.balance), reconciliation.currency)}
            label={label(reconciliation)}
            {...remove.deleteProps(reconciliation.id)}
          />
        ))}
      </Rows>
      <ConfirmDeleteDialog
        {...remove.dialogProps}
        title={t("accounts.reconcile.deleteTitle")}
        description={t("accounts.reconcile.deleteDescription")}
      />
    </>
  );
}

interface Props {
  account: AccountResponse | null;
  onClose: () => void;
}

export function ReconcileDialog({ account, onClose }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <EditModal
      item={account}
      title={(item) => t("accounts.reconcile.title", { account: item.name })}
      description={() => t("accounts.reconcile.description")}
      className="sm:max-w-xl"
      onClose={onClose}
    >
      {(item, close) => (
        <div className="space-y-6">
          <ReconcileForm account={item} onClose={close} />
          <section aria-labelledby="reconcile-earlier-title">
            <h3 id="reconcile-earlier-title" className="text-sm font-medium">
              {t("accounts.reconcile.earlier")}
            </h3>
            <QueryBoundary
              fallback={<RecordRowsSkeleton rows={2} />}
              errorSubject={t("accounts.reconcile.earlier")}
            >
              <EarlierReconciliations account={item} />
            </QueryBoundary>
          </section>
        </div>
      )}
    </EditModal>
  );
}
