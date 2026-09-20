import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useHouseholdsSuspense } from "@/api/generated";
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
import { CurrencySelect } from "@/components/currency-select";
import { useAppForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import { FormGrid } from "@/components/ui/form-grid";
import { Label } from "@/components/ui/label";
import { useReportingCurrency } from "@/hooks/use-formatters";
import { useFeature } from "@/hooks/use-settings";
import { submitToServer } from "@/lib/form-server-errors";
import { isIban, money, optionalText, requiredText } from "@/lib/validation";
import { accountTypes } from "../account-types";

export interface AccountFormValues {
  name: string;
  description: string | null;
  iban: string | null;
  type: AccountType;
  startingBalance: string;
  currency: Currency;
  scope: Scope;
  householdId: string | null;
}

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
  pending: boolean;
  onSubmit: (values: AccountFormValues) => Promise<unknown> | void;
  onCancel?: () => void;
}

function buildValues(value: FormValues): AccountFormValues {
  return {
    name: value.name.trim(),
    description: value.description.trim() || null,
    iban: value.iban.trim() || null,
    type: value.type,
    startingBalance: value.startingBalance,
    currency: value.currency,
    scope: value.scope,
    householdId: value.scope === "shared" ? value.householdId : null,
  };
}

export function AccountForm({ initial, pending, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const households = useHouseholdsSuspense();
  const householdList = households.data ?? [];
  const reportingCurrency = useReportingCurrency();
  const multiCurrency = useFeature("multiCurrency");

  const schema = z
    .object({
      name: requiredText(t, createAccountBodyNameMax),
      description: optionalText(t, createAccountBodyDescriptionMax),
      iban: z.string().refine((value) => !value.trim() || isIban(value), t("validation.iban")),
      type: z.enum(accountTypes),
      startingBalance: money(t),
      currency: z.enum(Currency),
      scope: z.enum(["personal", "shared"]),
      householdId: z.string(),
    })
    .refine((value) => value.scope !== "shared" || value.householdId !== "", {
      message: t("validation.required"),
      path: ["householdId"],
    });

  const form = useAppForm({
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      iban: initial?.iban ?? "",
      type: initial?.type ?? "checking",
      startingBalance: initial?.startingBalance ?? "0.00",
      currency: initial?.currency ?? reportingCurrency,
      scope: initial?.scope ?? "personal",
      householdId: initial?.householdId ?? "",
    } satisfies FormValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) =>
      submitToServer(submission, () => onSubmit(buildValues(submission.value))),
  });

  return (
    <form.AppForm>
      <FormGrid
        as="form"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        noValidate
      >
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
              options={accountTypes.map((accountType) => ({
                value: accountType,
                label: t(`accounts.types.${accountType}`),
              }))}
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
              <div className="space-y-1.5">
                <Label htmlFor="account-currency">{t("accounts.currency")}</Label>
                <CurrencySelect
                  id="account-currency"
                  value={field.value}
                  preferred={[reportingCurrency]}
                  onBlur={field.handleBlur}
                  onChange={(value) => field.handleChange(value)}
                />
                <p className="text-xs text-muted-foreground">{t("accounts.currencyHint")}</p>
              </div>
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
          <>
            <form.Field name="scope">
              {(field) => (
                <field.SelectFieldControl
                  id="account-scope"
                  label={t("sharing.scope")}
                  options={[
                    { value: "personal", label: t("sharing.personal") },
                    { value: "shared", label: t("sharing.shared") },
                  ]}
                />
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.values.scope}>
              {(scope) =>
                scope === "shared" ? (
                  <form.Field name="householdId">
                    {(field) => (
                      <field.SelectFieldControl
                        id="account-household"
                        label={t("sharing.household")}
                        options={[
                          { value: "", label: t("sharing.selectHousehold") },
                          ...householdList.map((household) => ({
                            value: household.id,
                            label: household.name,
                          })),
                        ]}
                      />
                    )}
                  </form.Field>
                ) : null
              }
            </form.Subscribe>
          </>
        ) : null}

        <div className="col-span-full flex flex-wrap justify-end gap-2 pt-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("actions.cancel")}
            </Button>
          ) : null}
          <form.SubmitButton pending={pending}>
            {initial ? t("actions.save") : t("actions.add")}
          </form.SubmitButton>
        </div>
      </FormGrid>
    </form.AppForm>
  );
}
