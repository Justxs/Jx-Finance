import { useTranslation } from "react-i18next";
import type { SecurityResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { useRetained } from "@/hooks/use-retained";
import { SecurityForm } from "./security-form";

interface Props {
  open: boolean;
  security?: SecurityResponse;
  onOpenChange: (open: boolean) => void;
  onSaved?: (security: SecurityResponse) => void;
}

export function SecurityModal({ open, security, onOpenChange, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const shown = useRetained(security, !open);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        shown
          ? `${t("investments.securities.edit")}: ${shown.symbol}`
          : t("investments.securities.add")
      }
      description={shown ? undefined : t("investments.securities.addDescription")}
    >
      <SecurityForm
        key={shown?.id ?? "new"}
        initial={shown}
        onClose={() => onOpenChange(false)}
        onSaved={onSaved}
      />
    </Modal>
  );
}
