import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateAsset, useUpdateAsset } from "@/api/generated";
import { AssetType } from "@/api/generated/model";
import { createAssetBodyNameMax } from "@/api/schemas/net-worth/net-worth.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useToday } from "@/hooks/use-settings";
import { silent, upsert } from "@/lib/mutations";
import { optionsOf } from "@/lib/options";
import { money, requiredText, requiredValue } from "@/lib/validation";
import type { HoldingFormProps } from "../holdings-section";

export interface AssetFormValues {
  name: string;
  type: string;
  amount: string;
  asOf: string;
}

const assetTypes = Object.values(AssetType);

export function AssetForm({ editing, onClose }: Readonly<HoldingFormProps<AssetFormValues>>) {
  const { t } = useTranslation();
  const today = useToday();
  const { create, update, pending, error } = upsert(
    useCreateAsset(silent({ onSuccess: onClose })),
    useUpdateAsset(silent({ onSuccess: onClose })),
  );
  const idPrefix = editing ? "asset-edit" : "asset";

  const schema = z.object({
    name: requiredText(t, createAssetBodyNameMax),
    type: z.string(),
    amount: money(t),
    asOf: requiredValue(t),
  });

  const defaultValues: AssetFormValues = editing?.values ?? {
    name: "",
    type: AssetType.other,
    amount: "",
    asOf: today,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    aliases: { currentValue: "amount" },
    submit: (value) => {
      const data = {
        name: value.name.trim(),
        type: assetTypes.find((type) => type === value.type) ?? AssetType.other,
        currentValue: value.amount,
        asOf: value.asOf,
      };

      return editing ? update({ id: editing.id, data }) : create({ data });
    },
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="name">
          {(field) => <field.TextField id={`${idPrefix}-name`} label={t("netWorth.name")} />}
        </form.Field>

        <form.Field name="type">
          {(field) => (
            <field.SelectFieldControl
              id={`${idPrefix}-type`}
              label={t("netWorth.type")}
              options={optionsOf(assetTypes, (type) => t(`netWorth.assetTypes.${type}`))}
            />
          )}
        </form.Field>

        <form.Field name="amount">
          {(field) => (
            <field.MoneyInputField id={`${idPrefix}-amount`} label={t("netWorth.currentValue")} />
          )}
        </form.Field>

        <form.Field name="asOf">
          {(field) => <field.DateField id={`${idPrefix}-as-of`} label={t("netWorth.asOf")} />}
        </form.Field>

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={editing ? t("actions.save") : t("actions.add")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
