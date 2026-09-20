import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import { cn } from "@/lib/utils";
import { SubmitButton } from "../submit-button/submit-button";

interface Props {
  submitLabel: ReactNode;
  pending?: boolean;
  disabled?: boolean;
  cancelDisabled?: boolean;
  span?: boolean;
  onCancel?: () => void;
}

export function FormActions({
  submitLabel,
  pending,
  disabled,
  cancelDisabled,
  span,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex justify-end gap-2 pt-2", span && "col-span-full flex-wrap")}>
      {onCancel ? (
        <Button type="button" variant="outline" disabled={cancelDisabled} onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
      ) : null}
      <SubmitButton pending={pending} disabled={disabled}>
        {submitLabel}
      </SubmitButton>
    </div>
  );
}
