import { useTranslation } from "react-i18next";
import { useCreateSecurity, useUpdateSecurity } from "@/api/generated";
import type { SecurityResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { useRetained } from "@/hooks/use-retained";
import { silent, upsert } from "@/lib/mutations";
import { SecurityForm } from "./security-form";

interface Props {
  open: boolean;
  security?: SecurityResponse;
  onOpenChange: (open: boolean) => void;
  onSaved?: (security: SecurityResponse) => void;
}

type ContentProps = Omit<Props, "open">;

function SecurityModalContent({ security, onOpenChange, onSaved }: Readonly<ContentProps>) {
  function handleSaved(saved: SecurityResponse) {
    onSaved?.(saved);
    onOpenChange(false);
  }

  const { create, update, pending, error } = upsert(
    useCreateSecurity(silent({ onSuccess: handleSaved })),
    useUpdateSecurity(silent({ onSuccess: handleSaved })),
  );

  return (
    <SecurityForm
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
  );
}

export function SecurityModal({ open, security, onOpenChange, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const shown = useRetained(security, !open);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={shown ? t("investments.securities.edit") : t("investments.securities.add")}
      description={shown ? undefined : t("investments.securities.addDescription")}
    >
      <SecurityModalContent
        key={shown?.id ?? "new"}
        security={shown}
        onOpenChange={onOpenChange}
        onSaved={onSaved}
      />
    </Modal>
  );
}
