import { useTranslation } from "react-i18next";
import { useCreateSecurity, useUpdateSecurity } from "@/api/generated";
import type { SecurityResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { SecurityForm } from "./security-form";

interface Props {
  open: boolean;
  security?: SecurityResponse;
  onOpenChange: (open: boolean) => void;
  onSaved?: (security: SecurityResponse) => void;
}

export function SecurityModal({ open, security, onOpenChange, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();

  function handleSaved(saved: SecurityResponse) {
    onSaved?.(saved);
    onOpenChange(false);
  }

  const createMutation = useCreateSecurity({
    mutation: { meta: { silent: true }, onSuccess: handleSaved },
  });
  const updateMutation = useUpdateSecurity({
    mutation: { meta: { silent: true }, onSuccess: handleSaved },
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
          error={createMutation.error ?? updateMutation.error}
          onSubmit={(values) => {
            if (security) {
              return updateMutation.mutateAsync({ id: security.id, data: values });
            }

            return createMutation.mutateAsync({ data: values });
          }}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Modal>
  );
}
