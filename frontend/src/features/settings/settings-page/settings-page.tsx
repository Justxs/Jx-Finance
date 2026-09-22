import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getSettingsQueryKey,
  useAccountsSuspense,
  useSyncExchangeRates,
  useUpdateSettings,
} from "@/api/generated";
import { FontPicker } from "@/components/font-picker/font-picker";
import { PalettePicker } from "@/components/palette-picker/palette-picker";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SectionLayout } from "@/components/section-layout/section-layout";
import { Button } from "@/components/ui/button/button";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { ImportDataSection } from "@/features/imports/import-data-section/import-data-section";
import { useIsoDate } from "@/hooks/use-formatters";
import { useSettings, useSettingsSuspense } from "@/hooks/use-settings";
import { BackupSection } from "../backup-section/backup-section";
import { SettingsForm } from "../settings-form/settings-form";
import { type SettingsSection, SettingsNav, settingsSections } from "../settings-nav/settings-nav";
import { SmtpSection } from "../smtp-section/smtp-section";

function SettingsContent({ section }: Readonly<{ section: SettingsSection }>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const formatDate = useIsoDate();
  const settings = useSettingsSuspense();
  const accounts = useAccountsSuspense();

  const updateMutation = useUpdateSettings({
    mutation: {
      onSuccess: (saved) => {
        queryClient.setQueryData(getSettingsQueryKey(), saved);
        toast.success(t("settings.savedToast"));
      },
    },
  });

  const syncMutation = useSyncExchangeRates({
    mutation: {
      onSuccess: (result) => {
        toast.success(
          result.added > 0
            ? t("settings.rates.synced", { count: result.added })
            : t("settings.rates.upToDate"),
        );
      },
    },
  });

  const exchangeRates = (
    <div className="mt-5 flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-3 rounded-md bg-background px-4 py-3 text-sm">
      <p>
        <span className="text-muted-foreground">{t("settings.rates.newest")}</span>{" "}
        <span className="font-semibold tabular-nums">
          {settings.ratesAsOf ? formatDate(settings.ratesAsOf) : t("settings.rates.none")}
        </span>
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-auto"
        pending={syncMutation.isPending}
        onClick={() => syncMutation.mutate()}
      >
        <RefreshCw />
        {t("settings.rates.syncNow")}
      </Button>
    </div>
  );

  const editable = {
    instanceName: settings.instanceName,
    features: settings.features,
    reportingCurrency: settings.reportingCurrency,
    enabledCurrencies: settings.enabledCurrencies,
    exchangeRateSyncEnabled: settings.exchangeRateSyncEnabled,
    defaultLanguage: settings.defaultLanguage,
    timeZone: settings.timeZone,
    firstDayOfWeek: settings.firstDayOfWeek,
    defaultAccountId: settings.defaultAccountId,
    defaultPageSize: settings.defaultPageSize,
  };

  return (
    <SettingsForm
      section={section}
      key={JSON.stringify(editable)}
      settings={settings}
      accounts={accounts.data ?? []}
      pending={updateMutation.isPending}
      exchangeRates={exchangeRates}
      onSubmit={(values, onSaved) =>
        updateMutation.mutateAsync({ data: values }, { onSuccess: onSaved })
      }
    />
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/settings" });
  const { features } = useSettings();
  const sections = settingsSections.filter((item) => item !== "import" || features.import);
  const section = sections.find((item) => item === search.section) ?? "general";

  return (
    <SectionLayout
      title={t("settings.title")}
      description={t("settings.description")}
      nav={<SettingsNav current={section} sections={sections} />}
    >
      <QueryBoundary fallback={<Skeleton className="h-96 w-full" />}>
        <SettingsContent section={section} />
      </QueryBoundary>
      {section === "email" ? <SmtpSection /> : null}
      {section === "import" ? <ImportDataSection /> : null}
      {section === "backups" ? <BackupSection /> : null}
      {section === "appearance" ? (
        <>
          <PalettePicker />
          <FontPicker />
        </>
      ) : null}
    </SectionLayout>
  );
}
