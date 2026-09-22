import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  TagResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { EditModal, Modal } from "@/components/modal";
import { TransactionAttachments } from "@/features/transactions/transaction-attachments/transaction-attachments";
import {
  TransactionForm,
  type TransactionDraft,
  type TransactionFormValues,
} from "../transaction-form";

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  prefill?: { key: string; draft: TransactionDraft };
  editing: TransactionResponse | null;
  onCancelEdit: () => void;
  updatePending: boolean;
  createPending: boolean;
  createError?: unknown;
  updateError?: unknown;
  onCreate: (values: TransactionFormValues) => Promise<unknown> | void;
  onCreateAnother?: (values: TransactionFormValues) => Promise<boolean>;
  onSaveAsTemplate?: (name: string, values: TransactionFormValues) => void;
  onUpdate: (values: TransactionFormValues) => Promise<unknown> | void;
}

export function TransactionFormSection({
  accounts,
  categories,
  tags,
  createOpen,
  onCreateOpenChange,
  prefill,
  editing,
  onCancelEdit,
  updatePending,
  createPending,
  createError,
  updateError,
  onCreate,
  onCreateAnother,
  onSaveAsTemplate,
  onUpdate,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <>
      <Modal
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        title={t("transactions.add")}
        className="max-w-2xl"
      >
        <TransactionForm
          key={prefill?.key ?? "blank"}
          accounts={accounts}
          categories={categories}
          tags={tags}
          prefill={prefill?.draft}
          pending={createPending}
          error={createError}
          onSubmit={onCreate}
          onSubmitAndAddAnother={onCreateAnother}
          onSaveAsTemplate={onSaveAsTemplate}
          onCancel={() => onCreateOpenChange(false)}
        />
      </Modal>

      <EditModal
        item={editing}
        onClose={onCancelEdit}
        title={t("transactions.editTitle")}
        className="max-w-2xl"
      >
        {(transaction) => (
          <>
            <TransactionForm
              accounts={accounts}
              categories={categories}
              tags={tags}
              initial={transaction}
              pending={updatePending}
              error={updateError}
              onSubmit={onUpdate}
              onCancel={onCancelEdit}
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
}
