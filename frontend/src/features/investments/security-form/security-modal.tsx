import { useTranslation } from "react-i18next";
import { useCreateSecurity, useUpdateSecurity } from "@/api/generated";
import type { SecurityResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { silent, upsert } from "@/lib/mutations";
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

  const { create, update, pending, error } = upsert(
    useCreateSecurity(silent({ onSuccess: handleSaved })),
    useUpdateSecurity(silent({ onSuccess: handleSaved })),
  );

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
          pending={pending}
          error={error}
          onSubmit={(values) => {
            if (security) {
              return update({ id: security.id, data: values });
            }

            return create({ data: values });
          }}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Modal>
  );
}
