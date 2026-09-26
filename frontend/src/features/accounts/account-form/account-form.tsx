import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateAccount, useHouseholdsSuspense, useUpdateAccount } from "@/api/generated";
import {
  type AccountResponse,
  type AccountType,
  Currency,
  type Scope,
} from "@/api/generated/model";
import {
  createAccountBodyDescriptionMax,
  createAccountBodyNameMax,
} from "@/api/schemas/accounts/accounts.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { SharingFields } from "@/components/sharing-fields/sharing-fields";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useReportingCurrency } from "@/hooks/use-formatters";
import { useFeature } from "@/hooks/use-settings";
import { silent, upsert } from "@/lib/mutations";
import { optionsOf } from "@/lib/options";
import {
  isIban,
  money,
  optionalText,
  refineSharing,
  requiredText,
  sharedHouseholdId,
  sharingShape,
} from "@/lib/validation";
import { useSharingDefaults } from "@/stores/active-household-store";
import { accountTypes } from "../account-types";

interface FormValues {
  name: string;
  description: string;
  iban: string;
  type: AccountType;
  startingBalance: string;
  currency: Currency;
  scope: Scope;
  householdId: string;
}

interface Props {
  initial?: AccountResponse;
  onClose: () => void;
}

function buildValues(value: FormValues) {
  return {
    ...value,
    name: value.name.trim(),
    description: value.description.trim() || null,
    iban: value.iban.trim() || null,
    householdId: sharedHouseholdId(value),
  };
}

export function AccountForm({ initial, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const households = useHouseholdsSuspense();
  const householdList = households.data;
  const reportingCurrency = useReportingCurrency();
  const multiCurrency = useFeature("multiCurrency");
  const sharing = useSharingDefaults(householdList, initial);

  const schema = refineSharing(
    z.object({
      name: requiredText(t, createAccountBodyNameMax),
      description: optionalText(t, createAccountBodyDescriptionMax),
      iban: z.string().refine((value) => !value.trim() || isIban(value), t("validation.iban")),
      type: z.enum(accountTypes),
      startingBalance: money(t),
      currency: z.enum(Currency),
      ...sharingShape(),
    }),
    t,
  );

  const { create, update, pending, error } = upsert(
    useCreateAccount(silent({ onSuccess: onClose })),
    useUpdateAccount(silent({ onSuccess: onClose })),
  );

  const form = useServerForm({
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      iban: initial?.iban ?? "",
      type: initial?.type ?? "checking",
      startingBalance: initial?.startingBalance ?? "0.00",
      currency: initial?.currency ?? reportingCurrency,
      ...sharing,
    } satisfies FormValues,
    schema,
    submit: (value) => {
      const data = buildValues(value);
      return initial ? update({ id: initial.id, data }) : create({ data });
    },
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="name">
          {(field) => (
            <field.TextField
              id="account-name"
              label={t("accounts.name")}
              placeholder={t("accounts.namePlaceholder")}
            />
          )}
        </form.Field>

        <form.Field name="type">
          {(field) => (
            <field.SelectFieldControl
              id="account-type"
              label={t("accounts.type")}
              options={optionsOf(accountTypes, (accountType) => t(`accounts.types.${accountType}`))}
            />
          )}
        </form.Field>

        <form.Field name="startingBalance">
          {(field) => (
            <field.MoneyInputField
              id="account-balance"
              label={t("accounts.startingBalance")}
              placeholder=""
            />
          )}
        </form.Field>

        {multiCurrency ? (
          <form.Field name="currency">
            {(field) => (
              <field.CurrencyField
                id="account-currency"
                label={t("accounts.currency")}
                hint={t("accounts.currencyHint")}
                preferred={[reportingCurrency]}
              />
            )}
          </form.Field>
        ) : null}

        <form.Field name="iban">
          {(field) => (
            <field.TextField
              id="account-iban"
              label={t("accounts.iban")}
              placeholder={t("accounts.ibanPlaceholder")}
            />
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <field.TextField
              id="account-description"
              label={t("accounts.description")}
              placeholder={t("accounts.descriptionPlaceholder")}
              className="col-span-full"
            />
          )}
        </form.Field>

        {householdList.length > 0 ? (
          <SharingFields
            form={form}
            fields={{ scope: "scope", householdId: "householdId" }}
            idPrefix="account"
            households={householdList}
          />
        ) : null}

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={initial ? t("actions.save") : t("actions.add")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
