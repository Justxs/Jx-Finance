import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  getSettingsQueryKey,
  useFinishSetup,
  useSetupReadiness,
  useUpdateSettings,
} from "@/api/generated";
import {
  Currency,
  type FeatureFlags,
  FirstDayOfWeek,
  type SettingsResponse,
} from "@/api/generated/model";
import {
  UpdateSettingsBody,
  updateSettingsBodyInstanceNameMax,
} from "@/api/schemas/settings/settings.zod";
import { Brand } from "@/components/brand/brand";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { Card } from "@/components/ui/card/card";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { NotificationProviderTabs } from "@/features/settings/notification-providers-section/notification-providers-section";
import { FeaturesFields } from "@/features/settings/settings-form/features-fields";
import { RegionalFields } from "@/features/settings/settings-form/regional-fields";
import { useSettingsSuspense } from "@/hooks/use-settings";
import { useMapTilesPresent } from "@/lib/map-tiles";
import { silentMutation } from "@/lib/mutations";
import { silentQuery } from "@/lib/query-client";
import type { FeatureKey } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { optionalText, requiredValue } from "@/lib/validation";
import { applyPreset, matchingPreset, presetNames, recommendedPreset } from "./feature-presets";
import { StartStep } from "./start-step";
import { TourPanels } from "./tour-panels";

export const wizardSteps = ["basics", "features", "start", "notifications", "tour"] as const;

export type WizardStep = (typeof wizardSteps)[number];

const shownSteps = ["admin", ...wizardSteps] as const;

const languages: ReadonlySet<string> = new Set(["en", "lt"]);

interface FormValues {
  instanceName: string;
  features: FeatureFlags;
  reportingCurrency: Currency;
  defaultLanguage: string;
  timeZone: string;
  firstDayOfWeek: FirstDayOfWeek;
}

function browserTimeZone(saved: string) {
  return saved === "UTC" ? Intl.DateTimeFormat().resolvedOptions().timeZone : saved;
}

function startingValues(settings: SettingsResponse, uiLanguage: string | undefined): FormValues {
  return {
    instanceName: settings.instanceName ?? "",
    features: settings.features,
    reportingCurrency: settings.reportingCurrency,
    defaultLanguage:
      uiLanguage && languages.has(uiLanguage) ? uiLanguage : settings.defaultLanguage,
    timeZone: browserTimeZone(settings.timeZone),
    firstDayOfWeek: settings.firstDayOfWeek,
  };
}

function StepList({ step }: Readonly<{ step: WizardStep }>) {
  const { t } = useTranslation();
  const current = shownSteps.indexOf(step);

  return (
    <ol className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
      {shownSteps.map((name, index) => (
        <li
          key={name}
          aria-current={index === current ? "step" : undefined}
          className={cn(
            "flex items-center gap-1.5",
            index === current && "font-medium text-foreground",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex w-4 justify-center tabular-nums",
              index <= current && "text-primary",
            )}
          >
            {index < current ? <Check className="size-3.5" /> : `${index + 1}.`}
          </span>
          {t(`settings.setupWizard.steps.${name}`)}
        </li>
      ))}
    </ol>
  );
}

function useReadinessNotes(): Partial<Record<FeatureKey, string>> {
  const { t } = useTranslation();
  const receiptReader =
    useSetupReadiness({ query: silentQuery }).data?.receiptReaderInstalled ?? true;
  const mapTiles = useMapTilesPresent();

  return {
    ...(receiptReader ? {} : { receiptReading: t("settings.setupWizard.features.needsTesseract") }),
    ...(mapTiles ? {} : { locations: t("settings.setupWizard.features.needsMapTiles") }),
  };
}

interface Props {
  step: WizardStep;
}

export function SetupWizard({ step }: Readonly<Props>) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const settings = useSettingsSuspense();
  const notes = useReadinessNotes();

  const updateMutation = useUpdateSettings({
    mutation: {
      ...silentMutation,
      onSuccess: (saved) => queryClient.setQueryData(getSettingsQueryKey(), saved),
    },
  });
  const finishMutation = useFinishSetup({
    mutation: {
      ...silentMutation,
      onSuccess: () => {
        queryClient.setQueryData<SettingsResponse>(
          getSettingsQueryKey(),
          (current) => current && { ...current, setupPending: false },
        );
        void navigate({ to: "/" });
      },
    },
  });

  function goTo(next: WizardStep) {
    void navigate({ to: "/setup", search: { step: next } });
  }

  const schema = z.object({
    instanceName: optionalText(t, updateSettingsBodyInstanceNameMax),
    features: UpdateSettingsBody.shape.features,
    reportingCurrency: z.enum(Currency),
    defaultLanguage: z.string(),
    timeZone: requiredValue(t),
    firstDayOfWeek: z.enum(FirstDayOfWeek),
  });

  const form = useServerForm({
    defaultValues: startingValues(settings, i18n.resolvedLanguage),
    schema,
    submit: async (value) => {
      await updateMutation.mutateAsync({
        data: {
          ...value,
          instanceName: value.instanceName.trim() || null,
          enabledCurrencies: settings.enabledCurrencies,
          exchangeRateSyncEnabled: settings.exchangeRateSyncEnabled,
          defaultAccountId: settings.defaultAccountId,
          defaultPageSize: settings.defaultPageSize,
          supportLinkEnabled: settings.supportLinkEnabled,
        },
      });
      goTo(step === "basics" ? "features" : "start");
    },
  });

  const previous = wizardSteps[wizardSteps.indexOf(step) - 1];
  const next = wizardSteps[wizardSteps.indexOf(step) + 1];

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6 flex justify-center">
        <Brand size="lg" stacked />
      </div>
      <Card className="p-6 sm:p-8">
        <p className="sr-only">
          {t("settings.setupWizard.progress", {
            current: shownSteps.indexOf(step) + 1,
            total: shownSteps.length,
          })}
        </p>
        <StepList step={step} />
        <h1
          key={step}
          ref={(node) => node?.focus()}
          tabIndex={-1}
          className="mt-6 text-lg font-semibold outline-none"
        >
          {t(`settings.setupWizard.${step}.title`)}
        </h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          {t(`settings.setupWizard.${step}.description`)}
        </p>

        {step === "start" || step === "notifications" || step === "tour" ? (
          <>
            {step === "start" ? <StartStep /> : null}
            {step === "notifications" ? (
              <div className="mt-6">
                <QueryBoundary fallback={null}>
                  <NotificationProviderTabs />
                </QueryBoundary>
              </div>
            ) : null}
            {step === "tour" ? <TourPanels /> : null}
            <FormError error={finishMutation.error} />
            <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => goTo(previous ?? "basics")}>
                {t("settings.setupWizard.back")}
              </Button>
              {next ? (
                <Button type="button" onClick={() => goTo(next)}>
                  {t("settings.setupWizard.continue")}
                </Button>
              ) : (
                <Button
                  type="button"
                  pending={finishMutation.isPending}
                  onClick={() => finishMutation.mutate()}
                >
                  {t("settings.setupWizard.tour.finish")}
                </Button>
              )}
            </div>
          </>
        ) : (
          <form.AppForm>
            <form.FormShell>
              {step === "basics" ? (
                <>
                  <FormGrid className="mt-6 max-w-3xl">
                    <form.Field name="instanceName">
                      {(field) => (
                        <field.TextField
                          id="setup-instance-name"
                          label={t("settings.general.instanceName")}
                          placeholder={t("brand.wordmark")}
                        />
                      )}
                    </form.Field>
                    <form.Field name="reportingCurrency">
                      {(field) => (
                        <field.CurrencyField
                          id="setup-reporting-currency"
                          all
                          label={t("settings.currencies.reporting")}
                          hint={t("settings.currencies.reportingHint")}
                        />
                      )}
                    </form.Field>
                  </FormGrid>
                  <RegionalFields
                    form={form}
                    fields={{
                      defaultLanguage: "defaultLanguage",
                      timeZone: "timeZone",
                      firstDayOfWeek: "firstDayOfWeek",
                    }}
                    savedTimeZone={browserTimeZone(settings.timeZone)}
                  />
                </>
              ) : (
                <>
                  <fieldset className="mt-6 min-w-0">
                    <legend className="text-sm font-semibold">
                      {t("settings.setupWizard.features.presets")}
                    </legend>
                    <form.Subscribe selector={(state) => state.values.features}>
                      {(features) => (
                        <div className="mt-2 grid gap-3 sm:grid-cols-3">
                          {presetNames.map((preset) => (
                            <div key={preset} className="min-w-0">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                aria-pressed={matchingPreset(features) === preset}
                                aria-describedby={`setup-preset-${preset}`}
                                onClick={() =>
                                  form.setFieldValue("features", applyPreset(features, preset))
                                }
                              >
                                {t(`settings.setupWizard.features.preset.${preset}.name`)}
                              </Button>
                              <p
                                id={`setup-preset-${preset}`}
                                className="mt-1.5 text-xs text-muted-foreground"
                              >
                                {preset === recommendedPreset ? (
                                  <span className="font-medium text-primary">
                                    {t("settings.setupWizard.features.recommended")}{" "}
                                  </span>
                                ) : null}
                                {t(`settings.setupWizard.features.preset.${preset}.hint`)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </form.Subscribe>
                  </fieldset>
                  <FeaturesFields
                    form={form}
                    fields={{ features: "features" }}
                    examples
                    notes={notes}
                  />
                  <p className="mt-6 max-w-prose text-xs text-muted-foreground">
                    {t("settings.setupWizard.features.optIn")}
                  </p>
                </>
              )}

              <FormError error={updateMutation.error ?? finishMutation.error} />
              <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="link-muted"
                  className="mr-auto"
                  disabled={finishMutation.isPending}
                  onClick={() => finishMutation.mutate()}
                >
                  {t("settings.setupWizard.skip")}
                </Button>
                {previous ? (
                  <Button type="button" variant="outline" onClick={() => goTo(previous)}>
                    {t("settings.setupWizard.back")}
                  </Button>
                ) : null}
                <form.SubmitButton pending={updateMutation.isPending}>
                  {t("settings.setupWizard.continue")}
                </form.SubmitButton>
              </div>
            </form.FormShell>
          </form.AppForm>
        )}
      </Card>
    </div>
  );
}
