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
import {
  UpdateSettingsBody,
  updateSettingsBodyInstanceNameMax,
} from "@/api/schemas/settings/settings.zod";
import { useServerForm } from "@/components/form";
import { Button } from "@/components/ui/button/button";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { TitledSection } from "@/components/ui/section/section";
import { namedOptions } from "@/lib/options";
import { optionalText, requiredValue } from "@/lib/validation";
import type { SettingsSection } from "../settings-nav/settings-nav";
import { CurrenciesFields } from "./currencies-fields";
import { FeaturesFields } from "./features-fields";
import { RegionalFields } from "./regional-fields";

interface Props {
  section: SettingsSection;
  settings: SettingsResponse;
  accounts: AccountResponse[];
  pending: boolean;
  exchangeRates: ReactNode;
  onSubmit: (values: UpdateSettingsRequest, onSaved: () => void) => Promise<unknown> | void;
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

const pageSizes = ["10", "20", "50", "100"];
export function SettingsForm({
  section,
  settings,
  accounts,
  pending,
  exchangeRates,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    instanceName: optionalText(t, updateSettingsBodyInstanceNameMax),
    features: UpdateSettingsBody.shape.features,
    reportingCurrency: z.enum(Currency),
    enabledCurrencies: z.array(z.enum(Currency)),
    exchangeRateSyncEnabled: z.boolean(),
    defaultLanguage: z.string(),
    timeZone: requiredValue(t),
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

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value, formApi) =>
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
      ),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-5">
        <TitledSection title={t("settings.general.title")} hidden={section !== "general"}>
          <FormGrid className="mt-4 max-w-3xl">
            <form.Field name="instanceName">
              {(field) => (
                <field.TextField
                  id="settings-instance-name"
                  label={t("settings.general.instanceName")}
                  hint={t("settings.general.instanceNameHint")}
                  placeholder={t("brand.wordmark")}
                />
              )}
            </form.Field>
          </FormGrid>
        </TitledSection>

        <TitledSection
          title={t("settings.features.title")}
          description={t("settings.features.description")}
          hidden={section !== "features"}
        >
          <FeaturesFields form={form} fields={{ features: "features" }} />
        </TitledSection>

        <TitledSection title={t("settings.currencies.title")} hidden={section !== "currencies"}>
          <CurrenciesFields
            form={form}
            fields={{
              multiCurrency: "features.multiCurrency",
              reportingCurrency: "reportingCurrency",
              enabledCurrencies: "enabledCurrencies",
            }}
            savedReportingCurrency={settings.reportingCurrency}
          />
        </TitledSection>

        <TitledSection title={t("settings.rates.title")} hidden={section !== "currencies"}>
          <form.Field name="exchangeRateSyncEnabled">
            {(field) => (
              <field.CheckboxField
                id="settings-auto-sync"
                className="mt-4 max-w-prose"
                label={t("settings.rates.autoSync")}
                hint={t("settings.rates.autoSyncHint")}
              />
            )}
          </form.Field>
          {exchangeRates}
        </TitledSection>

        <TitledSection title={t("settings.regional.title")} hidden={section !== "regional"}>
          <RegionalFields
            form={form}
            fields={{
              defaultLanguage: "defaultLanguage",
              timeZone: "timeZone",
              firstDayOfWeek: "firstDayOfWeek",
            }}
            savedTimeZone={settings.timeZone}
          />
        </TitledSection>

        <TitledSection title={t("settings.defaults.title")} hidden={section !== "defaults"}>
          <FormGrid className="mt-4 max-w-3xl">
            <form.Field name="defaultAccountId">
              {(field) => (
                <field.SelectFieldControl
                  id="settings-default-account"
                  label={t("settings.defaults.account")}
                  hint={t("settings.defaults.accountHint")}
                  options={namedOptions(accounts, t("settings.defaults.firstAccount"))}
                />
              )}
            </form.Field>

            <form.Field name="defaultPageSize">
              {(field) => (
                <field.SelectFieldControl
                  id="settings-page-size"
                  label={t("settings.defaults.pageSize")}
                  hint={t("settings.defaults.pageSizeHint")}
                  options={pageSizes.map((size) => ({ value: size, label: size }))}
                />
              )}
            </form.Field>
          </FormGrid>
        </TitledSection>

        <form.Subscribe selector={(state) => [state.isDirty, state.canSubmit] as const}>
          {([isDirty, canSubmit]) =>
            isDirty ? (
              <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-3 rounded-lg border bg-popover px-4 py-3 shadow-lg">
                <p className="mr-auto text-sm font-medium" role="status">
                  {t("settings.unsaved")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => form.reset()}
                >
                  {t("settings.discard")}
                </Button>
                <Button type="submit" pending={pending} disabled={!canSubmit}>
                  {t("actions.save")}
                </Button>
              </div>
            ) : null
          }
        </form.Subscribe>
      </form.FormShell>
    </form.AppForm>
  );
}
