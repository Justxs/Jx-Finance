import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getTransactionSuspenseQueryOptions } from "@/api/generated";
import type {
  AccountResponse,
  CategoryResponse,
  TagResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { EditModal, Modal } from "@/components/modal";
import type { ReceiptCandidateSplit } from "@/features/transactions/receipt-reading/fill-from-receipt";
import { SourceMark } from "@/features/transactions/source-mark/source-mark";
import { transactionName } from "@/features/transactions/transaction-amount/transaction-row";
import { TransactionAttachments } from "@/features/transactions/transaction-attachments/transaction-attachments";
import {
  type TransactionDraft,
  templateValuesFromFormValues,
} from "@/features/transactions/transaction-form/transaction-draft";
import {
  TransactionForm,
  type TransactionFormValues,
} from "@/features/transactions/transaction-form/transaction-form";
import { transactionTemplates } from "@/features/transactions/transaction-views";
import type { useTransactionMutations } from "@/features/transactions/transactions-page/use-transaction-mutations";
import { byId } from "@/lib/options";
import { savePreferences } from "@/stores/preferences";

interface Options {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  mutations: Pick<
    ReturnType<typeof useTransactionMutations>,
    "create" | "update" | "attachReceipt"
  >;
  onCategorized: (transactionId: string) => void;
}

export function useTransactionFormSection({
  accounts,
  categories,
  tags,
  mutations: { create, update, attachReceipt },
  onCategorized,
}: Readonly<Options>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/transactions" });
  const createOpen = useSearch({ from: "/transactions", select: (search) => search.new ?? false });
  const handedDraft = useLocation({ select: (location) => location.state.transactionDraft });
  const [prefill, setPrefill] = useState<{ key: string; draft: TransactionDraft } | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<TransactionResponse | null>(null);
  const [editPrefill, setEditPrefill] = useState<TransactionDraft | undefined>(undefined);

  function setCreateOpen(open: boolean) {
    create.reset();
    if (!open) {
      setPrefill(null);
      setReceiptFile(null);
    }
    void navigate({
      search: (prev) => ({ ...prev, new: open ? true : undefined }),
      replace: !open,
    });
  }

  function startFromDraft(draft: TransactionDraft) {
    setPrefill({ key: crypto.randomUUID(), draft });
    setCreateOpen(true);
  }

  function startBlank() {
    setPrefill(null);
    setCreateOpen(true);
  }

  function startEditing(transaction: TransactionResponse, draft?: TransactionDraft) {
    update.reset();
    setEditPrefill(draft);
    setEditing(transaction);
  }

  function offerRule(saved: TransactionResponse, previousCategoryId: string | null = null) {
    if (saved.categoryId && saved.categoryId !== previousCategoryId) {
      onCategorized(saved.id);
    }
  }

  function handleCreate(values: TransactionFormValues) {
    return create.mutateAsync(
      { data: values },
      {
        onSuccess: (created) => {
          savePreferences({ lastAccountId: created.accountId });
          offerRule(created);
          if (receiptFile) {
            void attachReceipt(created.id, receiptFile);
          }
          setCreateOpen(false);
        },
      },
    );
  }

  async function handleCreateAnother(values: TransactionFormValues) {
    const created = await create.mutateAsync({ data: values });
    savePreferences({ lastAccountId: created.accountId });
    offerRule(created);
    if (receiptFile) {
      setReceiptFile(null);
      void attachReceipt(created.id, receiptFile);
    }
    return true;
  }

  async function splitCandidate({ candidateId, draft, file }: ReceiptCandidateSplit) {
    if (file) {
      await attachReceipt(candidateId, file);
    }
    const candidate = await queryClient.query(getTransactionSuspenseQueryOptions(candidateId));
    setCreateOpen(false);
    startEditing(candidate, draft);
  }

  function saveAsTemplate(name: string, values: TransactionFormValues) {
    transactionTemplates.save(name, { values: templateValuesFromFormValues(values) });
    toast.success(t("transactions.templateSaved"));
  }

  async function handleUpdate(transaction: TransactionResponse, values: TransactionFormValues) {
    const saved = await update.mutateAsync({ id: transaction.id, data: values });
    setEditing(null);
    offerRule(saved, transaction.categoryId);
  }

  const dialogs = (
    <>
      <Modal
        open={createOpen && accounts.length > 0}
        onOpenChange={setCreateOpen}
        title={t("transactions.add")}
        className="max-w-2xl"
      >
        <TransactionForm
          key={prefill?.key ?? (handedDraft ? "handed" : "blank")}
          accounts={accounts}
          categories={categories}
          tags={tags}
          prefill={prefill?.draft ?? handedDraft}
          pending={create.isPending}
          error={create.error}
          onSubmit={handleCreate}
          onSubmitAndAddAnother={handleCreateAnother}
          onSaveAsTemplate={saveAsTemplate}
          onCancel={() => setCreateOpen(false)}
          onReceiptFile={setReceiptFile}
          onSplitCandidate={splitCandidate}
        />
      </Modal>

      <EditModal
        item={editing}
        onClose={() => setEditing(null)}
        title={(transaction) =>
          `${t("transactions.editTitle")}: ${transactionName(transaction, byId(categories), t)}`
        }
        className="max-w-2xl"
      >
        {(transaction, close) => (
          <>
            <SourceMark transaction={transaction} className="mb-4" />
            <TransactionForm
              accounts={accounts}
              categories={categories}
              tags={tags}
              initial={transaction}
              prefill={editPrefill}
              pending={update.isPending}
              error={update.error}
              onSubmit={(values) => handleUpdate(transaction, values)}
              onCancel={close}
            />
            <TransactionAttachments
              transactionId={transaction.id}
              className="mt-6 border-t border-border pt-4"
            />
          </>
        )}
      </EditModal>
    </>
  );

  return { startBlank, startFromDraft, startEditing, dialogs };
}
