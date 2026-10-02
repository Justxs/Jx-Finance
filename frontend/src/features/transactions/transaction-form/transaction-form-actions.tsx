import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import type { TransactionFormApi } from "./use-transaction-form";

interface Props {
  form: TransactionFormApi;
  editing: boolean;
  pending: boolean;
  anotherPending: boolean;
  onAnother?: () => void;
  onCancel?: () => void;
}

export function TransactionFormActions({
  form,
  editing,
  pending,
  anotherPending,
  onAnother,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <form.FormActions
      span
      submitLabel={editing ? t("actions.save") : t("actions.add")}
      pending={pending && !anotherPending}
      disabled={pending}
      onCancel={onCancel}
    >
      {onAnother ? (
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button
              type="button"
              variant="outline"
              pending={pending && anotherPending}
              disabled={!canSubmit || pending}
              onClick={onAnother}
            >
              {t("transactions.saveAndAddAnother")}
            </Button>
          )}
        </form.Subscribe>
      ) : null}
    </form.FormActions>
  );
}
