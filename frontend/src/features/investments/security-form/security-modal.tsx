import { useTranslation } from "react-i18next";
import { useCreateSecurityEndpoint, useUpdateSecurityEndpoint } from "@/api/generated";
import type { SecurityResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { useInvalidateInvestments } from "../use-invalidate-investments";
import { SecurityForm } from "./security-form";

interface Props {
  open: boolean;
  security?: SecurityResponse;
  onOpenChange: (open: boolean) => void;
  onSaved?: (security: SecurityResponse) => void;
}

export function SecurityModal({ open, security, onOpenChange, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const { invalidateEntries } = useInvalidateInvestments();

  function handleSaved(saved: SecurityResponse) {
    onSaved?.(saved);
    onOpenChange(false);
  }

  const createMutation = useCreateSecurityEndpoint({
    mutation: { onSuccess: handleSaved, onSettled: invalidateEntries },
  });
  const updateMutation = useUpdateSecurityEndpoint({
    mutation: { onSuccess: handleSaved, onSettled: invalidateEntries },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={security ? t("investments.securities.edit") : t("investments.securities.add")}
      description={security ? undefined : t("investments.securities.addDescription")}
    >
      {open ? (
        <SecurityForm
          key={security?.id ?? "new"}
          initial={security}
          pending={createMutation.isPending || updateMutation.isPending}
          onSubmit={(values) => {
            if (security) {
              updateMutation.mutate({ id: security.id, data: values });
            } else {
              createMutation.mutate({ data: values });
            }
          }}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Modal>
  );
}
