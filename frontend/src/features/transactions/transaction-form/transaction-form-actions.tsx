import { useTranslation } from "react-i18next";
import { modalFooterClass } from "@/components/form/form-actions/form-actions";
import { Button } from "@/components/ui/button/button";
import { cn } from "@/lib/utils";
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
    <div
      data-slot="form-actions"
      className={cn("col-span-full flex flex-wrap justify-end gap-2 pt-2", modalFooterClass)}
    >
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
      ) : null}
      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <>
            {onAnother ? (
              <Button
                type="button"
                variant="outline"
                pending={pending && anotherPending}
                disabled={!canSubmit || pending}
                onClick={onAnother}
              >
                {t("transactions.saveAndAddAnother")}
              </Button>
            ) : null}
            <Button
              type="submit"
              pending={pending && !anotherPending}
              disabled={!canSubmit || pending}
            >
              {editing ? t("actions.save") : t("actions.add")}
            </Button>
          </>
        )}
      </form.Subscribe>
    </div>
  );
}
