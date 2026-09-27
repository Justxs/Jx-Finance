import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateAsset, useUpdateAsset } from "@/api/generated";
import { AssetType, type AssetResponse } from "@/api/generated/model";
import { createAssetBodyNameMax } from "@/api/schemas/net-worth/net-worth.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useMoney, useMonthName } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { toCents } from "@/lib/money";
import { silent, upsert } from "@/lib/mutations";
import { optionsOf } from "@/lib/options";
import {
  isNonNegativeMoney,
  money,
  normalizeMoney,
  optionalNonNegativeMoney,
  optionalPositiveMoney,
  optionalWholeNumberBetween,
  requiredText,
  requiredValue,
} from "@/lib/validation";
import type { HoldingFormProps } from "../holdings-section";

export interface AssetFormValues {
  name: string;
  type: string;
  amount: string;
  asOf: string;
  depreciates: boolean;
  startDate: string;
  startValue: string;
  lifeYears: string;
  lifeMonths: string;
  residualValue: string;
}

const assetTypes = Object.values(AssetType);
const MAX_LIFE_MONTHS = 600;

export function assetFormValues(asset: AssetResponse): AssetFormValues {
  const terms = asset.depreciation;
  return {
    name: asset.name,
    type: asset.type,
    amount: asset.currentValue,
    asOf: asset.asOf,
    depreciates: terms !== null,
    startDate: terms?.startDate ?? asset.asOf,
    startValue: terms?.startValue ?? "",
    lifeYears: terms ? String(Math.floor(terms.lifeMonths / 12)) : "",
    lifeMonths: terms ? String(terms.lifeMonths % 12) : "",
    residualValue: terms?.residualValue ?? "",
  };
}

function lifeOf(values: AssetFormValues) {
  return Number(values.lifeYears.trim() || 0) * 12 + Number(values.lifeMonths.trim() || 0);
}

function termsOf(values: AssetFormValues) {
  return {
    startDate: values.startDate,
    startValue: normalizeMoney(values.startValue) || normalizeMoney(values.amount),
    lifeMonths: lifeOf(values),
    residualValue: normalizeMoney(values.residualValue) || "0",
  };
}

function reachMonth(startDate: string, steps: number) {
  const index = Number(startDate.slice(0, 4)) * 12 + Number(startDate.slice(5, 7)) - 1 + steps;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

function DepreciationPreview({ values }: Readonly<{ values: AssetFormValues }>) {
  const { t } = useTranslation();
  const formatMoney = useMoney();
  const formatMonth = useMonthName();
  const terms = termsOf(values);
  const valid =
    terms.startDate !== "" &&
    isNonNegativeMoney(terms.startValue) &&
    isNonNegativeMoney(terms.residualValue) &&
    terms.lifeMonths >= 1 &&
    terms.lifeMonths <= MAX_LIFE_MONTHS;
  const loss = valid ? toCents(terms.startValue) - toCents(terms.residualValue) : 0;

  if (loss <= 0) {
    return null;
  }

  const monthly = Math.ceil(loss / terms.lifeMonths);

  return (
    <p className="col-span-full text-sm text-muted-foreground tabular-nums" aria-live="polite">
      {t("netWorth.depreciation.preview", {
        amount: formatMoney.format(monthly / 100),
        residual: formatMoney.format(toCents(terms.residualValue) / 100),
        month: formatMonth(reachMonth(terms.startDate, Math.ceil(loss / monthly))),
      })}
    </p>
  );
}

export function AssetForm({ editing, onClose }: Readonly<HoldingFormProps<AssetFormValues>>) {
  const { t } = useTranslation();
  const today = useToday();
  const { create, update, pending, error } = upsert(
    useCreateAsset(silent({ onSuccess: onClose })),
    useUpdateAsset(silent({ onSuccess: onClose })),
  );
  const idPrefix = editing ? "asset-edit" : "asset";

  function notFuture(value: string) {
    return value <= today;
  }

  const schema = z
    .object({
      name: requiredText(t, createAssetBodyNameMax),
      type: z.string(),
      amount: money(t),
      asOf: requiredValue(t).refine(notFuture, t("netWorth.valuations.dateFuture")),
      depreciates: z.boolean(),
      startDate: z.string(),
      startValue: optionalPositiveMoney(t),
      lifeYears: optionalWholeNumberBetween(t, 0, MAX_LIFE_MONTHS / 12),
      lifeMonths: optionalWholeNumberBetween(t, 0, 11),
      residualValue: optionalNonNegativeMoney(t),
    })
    .refine(
      (value) => !value.depreciates || (value.startDate !== "" && notFuture(value.startDate)),
      {
        message: t("netWorth.depreciation.startDateInvalid"),
        path: ["startDate"],
      },
    )
    .refine(
      (value) => !value.depreciates || (lifeOf(value) >= 1 && lifeOf(value) <= MAX_LIFE_MONTHS),
      { message: t("netWorth.depreciation.lifeRange"), path: ["lifeYears"] },
    )
    .refine(
      (value) => {
        const terms = termsOf(value);
        return (
          !value.depreciates ||
          !isNonNegativeMoney(terms.startValue) ||
          !isNonNegativeMoney(terms.residualValue) ||
          toCents(terms.residualValue) < toCents(terms.startValue)
        );
      },
      { message: t("netWorth.depreciation.residualTooHigh"), path: ["residualValue"] },
    );

  const defaultValues: AssetFormValues = editing?.values ?? {
    name: "",
    type: AssetType.other,
    amount: "",
    asOf: today,
    depreciates: false,
    startDate: today,
    startValue: "",
    lifeYears: "",
    lifeMonths: "",
    residualValue: "",
  };

  const form = useServerForm({
    defaultValues,
    schema,
    aliases: {
      currentValue: "amount",
      "depreciation.startDate": "startDate",
      "depreciation.startValue": "startValue",
      "depreciation.lifeMonths": "lifeYears",
      "depreciation.residualValue": "residualValue",
    },
    submit: (value) => {
      const data = {
        name: value.name.trim(),
        type: assetTypes.find((type) => type === value.type) ?? AssetType.other,
        currentValue: normalizeMoney(value.amount),
        asOf: value.asOf,
        depreciation: value.depreciates ? termsOf(value) : null,
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

        <fieldset className="col-span-full grid gap-4 border-t pt-4 sm:grid-cols-2">
          <legend className="float-left mb-1 w-full text-sm font-semibold">
            {t("netWorth.depreciation.title")}
          </legend>
          <form.Field name="depreciates">
            {(field) => (
              <field.CheckboxField
                id={`${idPrefix}-depreciates`}
                label={t("netWorth.depreciation.enable")}
                hint={t("netWorth.depreciation.hint")}
                className="col-span-full"
              />
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values}>
            {(values) =>
              values.depreciates ? (
                <>
                  <form.Field name="startDate">
                    {(field) => (
                      <field.DateField
                        id={`${idPrefix}-start-date`}
                        label={t("netWorth.depreciation.startDate")}
                      />
                    )}
                  </form.Field>

                  <form.Field name="startValue">
                    {(field) => (
                      <field.MoneyInputField
                        id={`${idPrefix}-start-value`}
                        label={t("netWorth.depreciation.startValue")}
                        hint={t("netWorth.depreciation.startValueHint")}
                      />
                    )}
                  </form.Field>

                  <form.Field name="lifeYears">
                    {(field) => (
                      <field.TextField
                        id={`${idPrefix}-life-years`}
                        label={t("netWorth.depreciation.lifeYears")}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={MAX_LIFE_MONTHS / 12}
                      />
                    )}
                  </form.Field>

                  <form.Field name="lifeMonths">
                    {(field) => (
                      <field.TextField
                        id={`${idPrefix}-life-months`}
                        label={t("netWorth.depreciation.lifeMonths")}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={11}
                      />
                    )}
                  </form.Field>

                  <form.Field name="residualValue">
                    {(field) => (
                      <field.MoneyInputField
                        id={`${idPrefix}-residual`}
                        label={t("netWorth.depreciation.residualValue")}
                        hint={t("netWorth.depreciation.residualHint")}
                      />
                    )}
                  </form.Field>

                  <DepreciationPreview values={values} />
                </>
              ) : null
            }
          </form.Subscribe>
        </fieldset>

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
