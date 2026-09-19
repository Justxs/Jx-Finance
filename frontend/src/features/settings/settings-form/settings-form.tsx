import { useForm } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  type AccountResponse,
  Currency,
  type FeatureFlags,
  FirstDayOfWeek,
  type SettingsResponse,
  type UpdateSettingsRequest,
} from "@/api/generated/model";
import { allCurrencies, CurrencySelect, orderCurrencies } from "@/components/currency-select";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrencyName } from "@/hooks/use-formatters";
import type { FeatureKey } from "@/hooks/use-settings";

interface Props {
  settings: SettingsResponse;
  accounts: AccountResponse[];
  pending: boolean;
  exchangeRates: ReactNode;
  onSubmit: (values: UpdateSettingsRequest, onSaved: () => void) => void;
}

interface FormValues {
  instanceName: string;
  features: FeatureFlags;
  reportingCurrency: Currency;
  enabledCurrencies: Currency[];
  exchangeRateSyncEnabled: boolean;
  defaultLanguage: string;
  timeZone: string;
  firstDayOfWeek: FirstDayOfWeek;
  defaultAccountId: string;
  defaultPageSize: string;
}

const featureGroups: { titleKey: string; features: FeatureKey[] }[] = [
  { titleKey: "settings.featureGroups.plan", features: ["budgets", "goals", "recurringBills"] },
  { titleKey: "settings.featureGroups.review", features: ["netWorth", "investments", "reports"] },
  {
    titleKey: "settings.featureGroups.ledger",
    features: ["import", "households", "multiCurrency"],
  },
];

const pageSizes = ["10", "20", "50", "100"];
const languages = ["en", "lt"];

function timeZones(current: string) {
  const supported = Intl.supportedValuesOf("timeZone");
  return supported.includes(current) ? supported : [current, ...supported];
}

export function SettingsForm({
  settings,
  accounts,
  pending,
  exchangeRates,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const currencyName = useCurrencyName();

  const schema = z.object({
    instanceName: z.string().max(40, t("validation.maxLength", { max: 40 })),
    features: z.object({
      budgets: z.boolean(),
      goals: z.boolean(),
      recurringBills: z.boolean(),
      netWorth: z.boolean(),
      reports: z.boolean(),
      import: z.boolean(),
      households: z.boolean(),
      multiCurrency: z.boolean(),
      investments: z.boolean(),
    }),
    reportingCurrency: z.enum(Currency),
    enabledCurrencies: z.array(z.enum(Currency)),
    exchangeRateSyncEnabled: z.boolean(),
    defaultLanguage: z.string(),
    timeZone: z.string().min(1, t("validation.required")),
    firstDayOfWeek: z.enum(FirstDayOfWeek),
    defaultAccountId: z.string(),
    defaultPageSize: z.string(),
  });

  const defaultValues: FormValues = {
    instanceName: settings.instanceName ?? "",
    features: settings.features,
    reportingCurrency: settings.reportingCurrency,
    enabledCurrencies: [...settings.enabledCurrencies],
    exchangeRateSyncEnabled: settings.exchangeRateSyncEnabled,
    defaultLanguage: settings.defaultLanguage,
    timeZone: settings.timeZone,
    firstDayOfWeek: settings.firstDayOfWeek,
    defaultAccountId: settings.defaultAccountId ?? "",
    defaultPageSize: String(settings.defaultPageSize),
  };

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value, formApi }) => {
      onSubmit(
        {
          instanceName: value.instanceName.trim() || null,
          features: value.features,
          reportingCurrency: value.reportingCurrency,
          enabledCurrencies: value.enabledCurrencies,
          exchangeRateSyncEnabled: value.exchangeRateSyncEnabled,
          defaultLanguage: value.defaultLanguage,
          timeZone: value.timeZone,
          firstDayOfWeek: value.firstDayOfWeek,
          defaultAccountId: value.defaultAccountId || null,
          defaultPageSize: Number(value.defaultPageSize),
        },
        () => formApi.reset(value),
      );
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
      className="space-y-10"
    >
      <section className="section" aria-labelledby="settings-general">
        <h2 id="settings-general" className="section-title">
          {t("settings.general.title")}
        </h2>
        <div className="form-grid mt-4 max-w-3xl">
          <form.Field name="instanceName">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="settings-instance-name">{t("settings.general.instanceName")}</Label>
                <Input
                  id="settings-instance-name"
                  placeholder={t("brand.wordmark")}
                  value={field.value}
                  aria-invalid={field.errors.length > 0}
                  aria-describedby={
                    field.errors.length > 0
                      ? "settings-instance-name-error"
                      : "settings-instance-name-hint"
                  }
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <p id="settings-instance-name-hint" className="text-xs text-muted-foreground">
                  {t("settings.general.instanceNameHint")}
                </p>
                <FieldError id="settings-instance-name-error" message={field.errors[0]?.message} />
              </div>
            )}
          </form.Field>
        </div>
      </section>

      <section className="section" aria-labelledby="settings-features">
        <h2 id="settings-features" className="section-title">
          {t("settings.features.title")}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          {t("settings.features.description")}
        </p>
        <div className="mt-4 grid gap-x-10 gap-y-6 md:grid-cols-3">
          {featureGroups.map((group) => (
            <fieldset key={group.titleKey} className="min-w-0">
              <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t(group.titleKey)}
              </legend>
              <ul className="rows mt-1">
                {group.features.map((feature) => (
                  <form.Field key={feature} name={`features.${feature}`}>
                    {(field) => (
                      <li className="py-2.5">
                        <label className="flex items-center gap-3 text-sm font-medium">
                          <Checkbox
                            checked={field.value}
                            aria-describedby={`settings-feature-${feature}-hint`}
                            onCheckedChange={(next) => field.handleChange(next)}
                          />
                          {t(`settings.features.items.${feature}.name`)}
                        </label>
                        <p
                          id={`settings-feature-${feature}-hint`}
                          className="mt-0.5 pl-7 text-xs text-muted-foreground"
                        >
                          {t(`settings.features.items.${feature}.hint`)}
                        </p>
                      </li>
                    )}
                  </form.Field>
                ))}
              </ul>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="settings-currencies">
        <h2 id="settings-currencies" className="section-title">
          {t("settings.currencies.title")}
        </h2>
        <div className="form-grid mt-4 max-w-3xl">
          <form.Field name="reportingCurrency">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="settings-reporting-currency">
                  {t("settings.currencies.reporting")}
                </Label>
                <CurrencySelect
                  id="settings-reporting-currency"
                  all
                  value={field.value}
                  preferred={[settings.reportingCurrency]}
                  aria-describedby="settings-reporting-currency-hint"
                  onBlur={field.handleBlur}
                  onChange={(value) => field.handleChange(value)}
                />
                <p
                  id="settings-reporting-currency-hint"
                  role="status"
                  className="text-xs text-muted-foreground"
                >
                  {field.value === settings.reportingCurrency
                    ? t("settings.currencies.reportingHint")
                    : t("settings.currencies.reportingChangeWarning")}
                </p>
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe
          selector={(state) =>
            [state.values.features.multiCurrency, state.values.reportingCurrency] as const
          }
        >
          {([multiCurrency, reportingCurrency]) => (
            <form.Field name="enabledCurrencies">
              {(field) => (
                <fieldset className="mt-6 min-w-0" disabled={!multiCurrency}>
                  <legend className="text-sm font-medium">
                    {t("settings.currencies.enabled")}
                  </legend>
                  <p className="mt-1 max-w-prose text-xs text-muted-foreground">
                    {multiCurrency
                      ? t("settings.currencies.enabledHint", {
                          count: new Set([...field.value, reportingCurrency]).size,
                        })
                      : t("settings.currencies.enabledOff")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => field.handleChange([...allCurrencies])}
                    >
                      {t("settings.currencies.selectAll")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => field.handleChange([reportingCurrency])}
                    >
                      {t("settings.currencies.selectNone")}
                    </Button>
                  </div>
                  <ul className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                    {orderCurrencies([reportingCurrency]).map((currency) => {
                      const locked = currency === reportingCurrency;
                      return (
                        <li key={currency}>
                          <label className="flex items-center gap-3 py-1.5 text-sm">
                            <Checkbox
                              checked={locked || field.value.includes(currency)}
                              disabled={locked || !multiCurrency}
                              onCheckedChange={(next) =>
                                field.handleChange(
                                  next
                                    ? [...field.value, currency]
                                    : field.value.filter((item) => item !== currency),
                                )
                              }
                            />
                            <span className="w-9 shrink-0 font-medium tabular-nums">
                              {currency.toUpperCase()}
                            </span>
                            <span className="min-w-0 truncate text-muted-foreground">
                              {currencyName(currency)}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              )}
            </form.Field>
          )}
        </form.Subscribe>
      </section>

      <section className="section" aria-labelledby="settings-rates">
        <h2 id="settings-rates" className="section-title">
          {t("settings.rates.title")}
        </h2>
        <form.Field name="exchangeRateSyncEnabled">
          {(field) => (
            <div className="mt-4 max-w-prose">
              <label className="flex items-center gap-3 text-sm font-medium">
                <Checkbox
                  checked={field.value}
                  aria-describedby="settings-auto-sync-hint"
                  onCheckedChange={(next) => field.handleChange(next)}
                />
                {t("settings.rates.autoSync")}
              </label>
              <p id="settings-auto-sync-hint" className="mt-0.5 pl-7 text-xs text-muted-foreground">
                {t("settings.rates.autoSyncHint")}
              </p>
            </div>
          )}
        </form.Field>
        {exchangeRates}
      </section>

      <section className="section" aria-labelledby="settings-regional">
        <h2 id="settings-regional" className="section-title">
          {t("settings.regional.title")}
        </h2>
        <div className="form-grid mt-4 max-w-3xl">
          <form.Field name="defaultLanguage">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="settings-language">{t("settings.regional.language")}</Label>
                <SelectField
                  id="settings-language"
                  value={field.value}
                  onBlur={field.handleBlur}
                  onChange={(value) => field.handleChange(value)}
                  options={languages.map((language) => ({
                    value: language,
                    label: t(`settings.regional.languages.${language}`),
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.regional.languageHint")}
                </p>
              </div>
            )}
          </form.Field>

          <form.Field name="timeZone">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="settings-time-zone">{t("settings.regional.timeZone")}</Label>
                <SelectField
                  id="settings-time-zone"
                  value={field.value}
                  onBlur={field.handleBlur}
                  onChange={(value) => field.handleChange(value)}
                  options={timeZones(settings.timeZone).map((zone) => ({
                    value: zone,
                    label: zone.replaceAll("_", " "),
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.regional.timeZoneHint")}
                </p>
              </div>
            )}
          </form.Field>

          <form.Field name="firstDayOfWeek">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="settings-first-day">{t("settings.regional.firstDayOfWeek")}</Label>
                <SelectField
                  id="settings-first-day"
                  value={field.value}
                  onBlur={field.handleBlur}
                  onChange={(value) => field.handleChange(value)}
                  options={Object.values(FirstDayOfWeek).map((day) => ({
                    value: day,
                    label: t(`settings.regional.days.${day}`),
                  }))}
                />
              </div>
            )}
          </form.Field>
        </div>
      </section>

      <section className="section" aria-labelledby="settings-defaults">
        <h2 id="settings-defaults" className="section-title">
          {t("settings.defaults.title")}
        </h2>
        <div className="form-grid mt-4 max-w-3xl">
          <form.Field name="defaultAccountId">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="settings-default-account">{t("settings.defaults.account")}</Label>
                <SelectField
                  id="settings-default-account"
                  value={field.value}
                  onBlur={field.handleBlur}
                  onChange={(value) => field.handleChange(value)}
                  options={[
                    { value: "", label: t("settings.defaults.firstAccount") },
                    ...accounts.map((account) => ({ value: account.id, label: account.name })),
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.defaults.accountHint")}
                </p>
              </div>
            )}
          </form.Field>

          <form.Field name="defaultPageSize">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="settings-page-size">{t("settings.defaults.pageSize")}</Label>
                <SelectField
                  id="settings-page-size"
                  value={field.value}
                  onBlur={field.handleBlur}
                  onChange={(value) => field.handleChange(value)}
                  options={pageSizes.map((size) => ({ value: size, label: size }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.defaults.pageSizeHint")}
                </p>
              </div>
            )}
          </form.Field>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-3 flex flex-wrap items-center justify-end gap-3 border-t border-rule bg-background px-3 py-3">
        <form.Subscribe selector={(state) => [state.isDirty, state.canSubmit] as const}>
          {([isDirty, canSubmit]) => (
            <>
              <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
                {isDirty ? t("settings.unsaved") : t("settings.saved")}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={!isDirty || pending}
                onClick={() => form.reset()}
              >
                {t("settings.discard")}
              </Button>
              <Button type="submit" pending={pending} disabled={!isDirty || !canSubmit}>
                {t("actions.save")}
              </Button>
            </>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
