import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useGetHouseholdsEndpointSuspense } from "@/api/generated";
import {
  type AccountResponse,
  type AccountType,
  Currency,
  type Scope,
} from "@/api/generated/model";
import { CurrencySelect } from "@/components/currency-select";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReportingCurrency } from "@/hooks/use-formatters";
import { useFeature } from "@/hooks/use-settings";
import { isIban, isMoney } from "@/lib/validation";
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
  onSubmit: (values: AccountFormValues) => void;
  onCancel?: () => void;
}

export function AccountForm({ initial, pending, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const households = useGetHouseholdsEndpointSuspense();
  const householdList = households.data ?? [];
  const reportingCurrency = useReportingCurrency();
  const multiCurrency = useFeature("multiCurrency");

  const schema = z
    .object({
      name: z
        .string()
        .trim()
        .min(1, t("validation.required"))
        .max(100, t("validation.maxLength", { max: 100 })),
      description: z.string().max(500, t("validation.maxLength", { max: 500 })),
      iban: z.string().refine((value) => !value.trim() || isIban(value), t("validation.iban")),
      type: z.enum(accountTypes),
      startingBalance: z.string().refine(isMoney, t("validation.money")),
      currency: z.enum(Currency),
      scope: z.enum(["personal", "shared"]),
      householdId: z.string(),
    })
    .refine((value) => value.scope !== "shared" || value.householdId !== "", {
      message: t("validation.required"),
      path: ["householdId"],
    });

  const form = useForm({
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
    onSubmit: ({ value }) => {
      onSubmit({
        name: value.name.trim(),
        description: value.description.trim() || null,
        iban: value.iban.trim() || null,
        type: value.type,
        startingBalance: value.startingBalance,
        currency: value.currency,
        scope: value.scope,
        householdId: value.scope === "shared" ? value.householdId : null,
      });
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      noValidate
      className="form-grid"
    >
      <form.Field name="name">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="account-name">{t("accounts.name")}</Label>
            <Input
              id="account-name"
              placeholder={t("accounts.namePlaceholder")}
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "account-name-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id="account-name-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="type">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="account-type">{t("accounts.type")}</Label>
            <SelectField
              id="account-type"
              value={field.value}
              onBlur={field.handleBlur}
              onChange={(value) => field.handleChange(value)}
              options={accountTypes.map((accountType) => ({
                value: accountType,
                label: t(`accounts.types.${accountType}`),
              }))}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="startingBalance">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="account-balance">{t("accounts.startingBalance")}</Label>
            <Input
              id="account-balance"
              inputMode="decimal"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "account-balance-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id="account-balance-error" message={field.errors[0]?.message} />
          </div>
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
          <div className="space-y-1.5">
            <Label htmlFor="account-iban">{t("accounts.iban")}</Label>
            <Input
              id="account-iban"
              placeholder={t("accounts.ibanPlaceholder")}
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "account-iban-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id="account-iban-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div className="col-span-full space-y-1.5">
            <Label htmlFor="account-description">{t("accounts.description")}</Label>
            <Input
              id="account-description"
              placeholder={t("accounts.descriptionPlaceholder")}
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "account-description-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id="account-description-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      {householdList.length > 0 ? (
        <>
          <form.Field name="scope">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="account-scope">{t("sharing.scope")}</Label>
                <SelectField
                  id="account-scope"
                  value={field.value}
                  onChange={(value) => field.handleChange(value)}
                  options={[
                    { value: "personal", label: t("sharing.personal") },
                    { value: "shared", label: t("sharing.shared") },
                  ]}
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.scope}>
            {(scope) =>
              scope === "shared" ? (
                <form.Field name="householdId">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="account-household">{t("sharing.household")}</Label>
                      <SelectField
                        id="account-household"
                        value={field.value}
                        aria-invalid={field.errors.length > 0}
                        aria-describedby={
                          field.errors.length > 0 ? "account-household-error" : undefined
                        }
                        onBlur={field.handleBlur}
                        onChange={(value) => field.handleChange(value)}
                        options={[
                          { value: "", label: t("sharing.selectHousehold") },
                          ...householdList.map((household) => ({
                            value: household.id,
                            label: household.name,
                          })),
                        ]}
                      />
                      <FieldError id="account-household-error" message={field.errors[0]?.message} />
                    </div>
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
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={pending} disabled={!canSubmit}>
              {initial ? t("actions.save") : t("actions.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
