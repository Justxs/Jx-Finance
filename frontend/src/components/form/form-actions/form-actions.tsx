import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SubmitButton } from "@/components/form/submit-button/submit-button";
import { Button } from "@/components/ui/button/button";
import { cn } from "@/lib/utils";

const modalFooterClass =
  "in-data-[slot=modal-body]:sticky in-data-[slot=modal-body]:bottom-0 in-data-[slot=modal-body]:z-10 in-data-[slot=modal-body]:-mx-4 in-data-[slot=modal-body]:-mb-5 in-data-[slot=modal-body]:border-t in-data-[slot=modal-body]:bg-popover in-data-[slot=modal-body]:px-4 in-data-[slot=modal-body]:py-3 sm:in-data-[slot=modal-body]:-mx-6 sm:in-data-[slot=modal-body]:px-6";

interface Props {
  submitLabel?: ReactNode;
  pending?: boolean;
  disabled?: boolean;
  cancelDisabled?: boolean;
  span?: boolean;
  onCancel?: () => void;
  children?: ReactNode;
}

export function FormActions({
  submitLabel,
  pending,
  disabled,
  cancelDisabled,
  span,
  onCancel,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div
      data-slot="form-actions"
      className={cn(
        "flex flex-wrap justify-end gap-2 pt-2",
        span && "col-span-full",
        modalFooterClass,
      )}
    >
      {onCancel ? (
        <Button type="button" variant="outline" disabled={cancelDisabled} onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
      ) : null}
      {children}
      {submitLabel === undefined ? null : (
        <SubmitButton pending={pending} disabled={disabled}>
          {submitLabel}
        </SubmitButton>
      )}
    </div>
  );
}
