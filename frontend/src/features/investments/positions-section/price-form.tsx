import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useSetSecurityPrice } from "@/api/generated";
import type { SecurityResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useToday } from "@/hooks/use-settings";
import { silentMutation } from "@/lib/mutations";
import { quantity, requiredValue } from "@/lib/validation";

interface Props {
  security: SecurityResponse;
  onClose: () => void;
}

export function PriceForm({ security, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const mutation = useSetSecurityPrice({ mutation: { ...silentMutation, onSuccess: onClose } });

  const schema = z.object({
    lastPrice: quantity(t, "investments.validation.price"),
    lastPriceDate: requiredValue(t).refine(
      (value) => value <= today,
      t("investments.validation.priceDateFuture"),
    ),
  });

  const form = useServerForm({
    defaultValues: { lastPrice: security.lastPrice ?? "", lastPriceDate: today },
    schema,
    submit: (value) => mutation.mutateAsync({ id: security.id, data: value }),
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="lastPrice">
          {(field) => (
            <field.MoneyInputField
              id="price-form-price"
              label={t("investments.price.label", { currency: security.currency.toUpperCase() })}
              hint={t("investments.price.hint")}
            />
          )}
        </form.Field>

        <form.Field name="lastPriceDate">
          {(field) => <field.DateField id="price-form-date" label={t("investments.price.date")} />}
        </form.Field>

        <FormError error={mutation.error} />

        <form.FormActions
          span
          pending={mutation.isPending}
          submitLabel={t("actions.save")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
