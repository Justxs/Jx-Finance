import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateTransfer } from "@/api/generated";
import type { AccountResponse, TransferResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
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
  const updateMutation = useUpdateTransfer({
    mutation: { meta: { silent: true }, onSuccess: onClose },
  });

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
  const [shown, setShown] = useState(transfer);

  if (transfer !== null && transfer !== shown) {
    setShown(transfer);
  }

  return (
    <Modal
      open={transfer !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={t("transfers.editTitle")}
    >
      {shown ? (
        <TransferEditForm key={shown.id} accounts={accounts} transfer={shown} onClose={onClose} />
      ) : null}
    </Modal>
  );
}
