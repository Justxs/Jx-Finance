import { useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteAccount, useAccountsSuspense } from "@/api/generated";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { EditModal, Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { Section } from "@/components/ui/section/section";
import { AccountForm } from "@/features/accounts/account-form/account-form";
import { accountListParams } from "@/features/accounts/account-queries";
import { AccountsTable } from "@/features/accounts/accounts-table/accounts-table";
import { ArchivedAccounts } from "@/features/accounts/archived-accounts/archived-accounts";
import { CashFlowForecast } from "@/features/accounts/cash-flow-forecast/cash-flow-forecast";
import { ConversionsSection } from "@/features/accounts/conversions-section/conversions-section";
import { ReconcileDialog } from "@/features/accounts/reconcile-dialog/reconcile-dialog";
import { TransfersSection } from "@/features/accounts/transfers-section/transfers-section";
import { ImportDialog } from "@/features/imports/import-dialog/import-dialog";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useSettings } from "@/hooks/use-settings";
import { notify } from "@/lib/mutations";
import { MovementsSkeleton } from "./accounts-page-pending";

export function AccountsPage() {
  const { t } = useTranslation();
  const { features } = useSettings();

  const { new: creating, reconcile, ...filters } = useSearch({ from: "/accounts" });
  const navigate = useNavigate({ from: "/accounts" });
  const [shown, stale] = useDeferredParams(filters);
  const accounts = useAccountsSuspense(accountListParams(shown));
  const allAccounts = useAccountsSuspense();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [convertAccountId, setConvertAccountId] = useState<string | null>(null);
  const [importAccountId, setImportAccountId] = useState<string | null>(null);

  function setCreating(next: "account" | "transfer" | undefined) {
    void navigate({ search: (prev) => ({ ...prev, new: next }), replace: next === undefined });
  }

  function setReconcileId(id: string | undefined) {
    void navigate({ search: (prev) => ({ ...prev, reconcile: id }), replace: id === undefined });
  }

  function setCreateOpen(open: boolean) {
    setCreating(open ? "account" : undefined);
  }

  function setTransferOpen(open: boolean) {
    setCreating(open ? "transfer" : undefined);
  }

  const createOpen = creating === "account";

  const deleteMutation = useDeleteAccount({ mutation: notify(t("accounts.archived")) });

  const accountList = accounts.data;
  const remove = useConfirmedDelete(deleteMutation, accountList, (account) => account.name);
  const editingAccount = accountList.find((account) => account.id === editingId);
  const allAccountList = allAccounts.data;

  return (
    <div className="space-y-5">
      <PageHeader title={t("accounts.title")}>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          {t("accounts.add")}
        </Button>
      </PageHeader>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title={t("accounts.add")}>
        <AccountForm onClose={() => setCreateOpen(false)} />
      </Modal>

      <EditModal
        item={editingAccount ?? null}
        title={(account) => `${t("actions.edit")}: ${account.name}`}
        onClose={() => setEditingId(null)}
      >
        {(account, close) => <AccountForm initial={account} onClose={close} />}
      </EditModal>

      <Section as="div">
        <AccountsTable
          accounts={accountList}
          stale={stale}
          onEdit={setEditingId}
          deletingId={remove.pendingId}
          onDelete={remove.request}
          onConvert={features.multiCurrency ? setConvertAccountId : undefined}
          onImport={features.import ? setImportAccountId : undefined}
          onReconcile={setReconcileId}
          onCreate={() => setCreateOpen(true)}
          positiveTotal={allAccountList.reduce(
            (sum, account) => sum + Math.max(0, Number(account.reportingBalance)),
            0,
          )}
        />
      </Section>

      {features.recurringBills ? <CashFlowForecast /> : null}

      <QueryBoundary fallback={null} errorSubject={t("accounts.archivedList.label")}>
        <ArchivedAccounts />
      </QueryBoundary>

      <QueryBoundary fallback={<MovementsSkeleton />} errorSubject={t("transfers.heading")}>
        <TransfersSection
          accounts={allAccountList}
          addOpen={creating === "transfer"}
          onAddOpenChange={setTransferOpen}
        />
      </QueryBoundary>

      {features.multiCurrency ? (
        <QueryBoundary fallback={<MovementsSkeleton />} errorSubject={t("conversions.heading")}>
          <ConversionsSection
            accounts={allAccountList}
            convertAccountId={convertAccountId}
            onConvertAccountChange={setConvertAccountId}
          />
        </QueryBoundary>
      ) : null}

      {features.import ? (
        <ImportDialog
          open={importAccountId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setImportAccountId(null);
            }
          }}
          accounts={allAccountList}
          initialAccountId={importAccountId ?? undefined}
        />
      ) : null}

      <ReconcileDialog
        account={allAccountList.find((account) => account.id === reconcile) ?? null}
        onClose={() => setReconcileId(undefined)}
      />

      <ConfirmDeleteDialog
        {...remove.dialogProps}
        title={t("accounts.archiveTitle")}
        description={t("accounts.archiveDescription")}
        confirmLabel={t("actions.archive")}
      />
    </div>
  );
}
