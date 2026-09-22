import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useBrokerConnectionsSuspense } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { useDateTime } from "@/hooks/use-formatters";
import { ConnectionForm } from "./connection-form";
import { BrokerImportResult } from "./import-result";
import type { BrokerImportMutations } from "./use-broker-import-mutations";

interface Props {
  accounts: readonly AccountResponse[];
  accountId: string;
  mutations: BrokerImportMutations;
}

export function ConnectionPanel({ accounts, accountId, mutations }: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();
  const connections = useBrokerConnectionsSuspense();
  const connection = connections.data.find((item) => item.accountId === accountId);
  const accountName = accounts.find((account) => account.id === accountId)?.name;

  const [formVersion, setFormVersion] = useState(0);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const saveMutation = mutations.saveConnection;
  const deleteMutation = mutations.deleteConnection;
  const syncMutation = mutations.syncConnection;

  function resetForm() {
    setFormVersion((version) => version + 1);
  }

  const syncResult =
    syncMutation.variables?.accountId === accountId ? syncMutation.data : undefined;
  const syncFailure = syncMutation.variables?.accountId === accountId ? syncMutation.error : null;
  const busy = mutations.busy;

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        {t("investments.connection.description")}
      </p>

      {connection ? (
        <dl className="space-y-1 border-y border-rule py-2.5 text-sm">
          <div className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-muted-foreground">{t("investments.connection.lastSync")}</dt>
            <dd className="tabular-nums">
              {connection.lastSyncAt
                ? formatDateTime(connection.lastSyncAt)
                : t("investments.connection.neverSynced")}
            </dd>
          </div>
          {connection.lastError ? (
            <div>
              <dt className="font-medium text-expense">{t("investments.connection.lastError")}</dt>
              <dd className="wrap-break-word text-expense">{connection.lastError}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <ConnectionForm
        key={`${accountId}:${connection ? "stored" : "new"}:${formVersion}`}
        accounts={accounts}
        accountId={accountId}
        connection={connection}
        pending={saveMutation.isPending}
        disabled={busy}
        onSubmit={(values) =>
          saveMutation.mutateAsync(
            { accountId, data: values },
            {
              onSuccess: () => {
                toast.success(t("investments.connection.saved"));
                resetForm();
              },
            },
          )
        }
        secondaryActions={
          connection ? (
            <>
              <Button
                type="button"
                variant="ghost-destructive"
                className="mr-auto"
                disabled={busy}
                pending={deleteMutation.isPending}
                onClick={() => setRemoveTarget(accountId)}
              >
                {t("investments.connection.remove")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                pending={syncMutation.isPending}
                onClick={() => syncMutation.mutate({ accountId })}
              >
                {t("investments.connection.syncNow")}
              </Button>
            </>
          ) : null
        }
      />

      <div role="status" aria-live="polite">
        {syncMutation.isPending ? (
          <p className="text-sm text-muted-foreground">{t("investments.connection.syncing")}</p>
        ) : null}
        {!syncMutation.isPending && syncResult ? <BrokerImportResult result={syncResult} /> : null}
      </div>
      <FormError error={syncFailure} />

      <ConfirmDeleteDialog
        target={removeTarget}
        itemLabel={t("investments.connection.removeLabel", { account: accountName ?? "" })}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ accountId: id }, { onSuccess: resetForm })}
      />
    </div>
  );
}
