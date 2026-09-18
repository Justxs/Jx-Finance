import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TransactionResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { TransactionForm, type TransactionFormValues } from "../transaction-form";

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  editing: TransactionResponse | null;
  onCancelEdit: () => void;
  updatePending: boolean;
  createPending: boolean;
  onCreate: (values: TransactionFormValues) => void;
  onCreateAnother?: (values: TransactionFormValues) => Promise<boolean>;
  onUpdate: (values: TransactionFormValues) => void;
}

export function TransactionFormSection({
  accounts,
  categories,
  createOpen,
  onCreateOpenChange,
  editing,
  onCancelEdit,
  updatePending,
  createPending,
  onCreate,
  onCreateAnother,
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
          accounts={accounts}
          categories={categories}
          pending={createPending}
          onSubmit={onCreate}
          onSubmitAndAddAnother={onCreateAnother}
          onCancel={() => onCreateOpenChange(false)}
        />
      </Modal>

      <Modal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            onCancelEdit();
          }
        }}
        title={t("transactions.editTitle")}
        className="max-w-2xl"
      >
        {editing ? (
          <TransactionForm
            key={editing.id}
            accounts={accounts}
            categories={categories}
            initial={editing}
            pending={updatePending}
            onSubmit={onUpdate}
            onCancel={onCancelEdit}
          />
        ) : null}
      </Modal>
    </>
  );
}
