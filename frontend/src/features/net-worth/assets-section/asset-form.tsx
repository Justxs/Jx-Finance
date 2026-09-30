import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateAsset, useHouseholdsSuspense, useUpdateAsset } from "@/api/generated";
import { AssetType, type AssetResponse, type Scope } from "@/api/generated/model";
import { createAssetBodyNameMax } from "@/api/schemas/net-worth/net-worth.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { SharingFields } from "@/components/sharing-fields/sharing-fields";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import type { BalanceItemFormProps } from "@/features/net-worth/balance-items-section/balance-items-section";
import { useMoney, useMonthName } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { toCents } from "@/lib/money";
import { silentMutation, upsert } from "@/lib/mutations";
import { optionsOf } from "@/lib/options";
import {
  isNonNegativeMoney,
  money,
  normalizeMoney,
  optionalNonNegativeMoney,
  optionalPositiveMoney,
  optionalWholeNumberBetween,
  refineSharing,
  requiredText,
  requiredValue,
  sharingPayload,
  sharingShape,
} from "@/lib/validation";
import { useSharingDefaults } from "@/stores/active-household-store";

interface AssetFormValues {
  name: string;
  type: AssetType;
  amount: string;
  asOf: string;
  depreciates: boolean;
  startDate: string;
  startValue: string;
  lifeYears: string;
  lifeMonths: string;
  residualValue: string;
  scope: Scope;
  householdId: string;
}

const assetTypes = Object.values(AssetType);
const MAX_LIFE_MONTHS = 600;

function assetFormValues(asset: AssetResponse): AssetFormValues {
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
    scope: asset.scope,
    householdId: asset.householdId ?? "",
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

export function AssetForm({ editing, onClose }: Readonly<BalanceItemFormProps<AssetResponse>>) {
  const { t } = useTranslation();
  const today = useToday();
  const { create, update, pending, error } = upsert(
    useCreateAsset({ mutation: { ...silentMutation, onSuccess: onClose } }),
    useUpdateAsset({ mutation: { ...silentMutation, onSuccess: onClose } }),
  );
  const idPrefix = editing ? "asset-edit" : "asset";
  const sharing = useSharingDefaults(useHouseholdsSuspense().data, editing);

  function notFuture(value: string) {
    return value <= today;
  }

  const schema = refineSharing(
    z
      .object({
        name: requiredText(t, createAssetBodyNameMax),
        type: z.enum(AssetType),
        amount: money(t),
        asOf: requiredValue(t).refine(notFuture, t("netWorth.valuations.dateFuture")),
        depreciates: z.boolean(),
        startDate: z.string(),
        startValue: optionalPositiveMoney(t),
        lifeYears: optionalWholeNumberBetween(t, 0, MAX_LIFE_MONTHS / 12),
        lifeMonths: optionalWholeNumberBetween(t, 0, 11),
        residualValue: optionalNonNegativeMoney(t),
        ...sharingShape(),
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
      ),
    t,
  );

  const defaultValues: AssetFormValues = editing
    ? assetFormValues(editing)
    : {
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
        ...sharing,
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
        type: value.type,
        currentValue: normalizeMoney(value.amount),
        asOf: value.asOf,
        depreciation: value.depreciates ? termsOf(value) : null,
        ...sharingPayload(value),
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

        <SharingFields
          form={form}
          fields={{ scope: "scope", householdId: "householdId" }}
          idPrefix={idPrefix}
        />

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
