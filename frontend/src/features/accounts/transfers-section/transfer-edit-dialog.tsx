import { useTranslation } from "react-i18next";
import { useUpdateTransfer } from "@/api/generated";
import type { AccountResponse, TransferResponse } from "@/api/generated/model";
import { EditModal } from "@/components/modal";
import { silent } from "@/lib/mutations";
import { TransferForm } from "./transfer-form";

interface FormProps {
  accounts: AccountResponse[];
  transfer: TransferResponse;
  onClose: () => void;
}

interface Props {
  accounts: AccountResponse[];
  transfer: TransferResponse | null;
  onClose: () => void;
}

function TransferEditForm({ accounts, transfer, onClose }: Readonly<FormProps>) {
  const updateMutation = useUpdateTransfer(silent({ onSuccess: onClose }));

  return (
    <TransferForm
      accounts={accounts}
      transfer={transfer}
      error={updateMutation.error}
      pending={updateMutation.isPending}
      onSubmit={(values) => updateMutation.mutateAsync({ id: transfer.id, data: values })}
      onCancel={onClose}
    />
  );
}

export function TransferEditDialog({ accounts, transfer, onClose }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <EditModal item={transfer} title={t("transfers.editTitle")} onClose={onClose}>
      {(shown) => <TransferEditForm accounts={accounts} transfer={shown} onClose={onClose} />}
    </EditModal>
  );
}
