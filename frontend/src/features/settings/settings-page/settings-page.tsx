import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getSettingsQueryKey,
  useAccountsSuspense,
  useSyncExchangeRates,
  useUpdateSettings,
} from "@/api/generated";
import { FontPicker } from "@/components/font-picker";
import { PageHeader } from "@/components/page-header";
import { PalettePicker } from "@/components/palette-picker";
import { QueryBoundary } from "@/components/query-boundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsoDate } from "@/hooks/use-formatters";
import { useSettingsSuspense } from "@/hooks/use-settings";
import { SettingsForm } from "../settings-form";

function SettingsContent() {
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
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-rule py-2.5 text-sm">
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

  return (
    <div className="space-y-10">
      <PageHeader title={t("settings.title")} description={t("settings.description")} />
      <QueryBoundary fallback={<Skeleton className="h-96 w-full" />}>
        <SettingsContent />
      </QueryBoundary>
      <PalettePicker />
      <FontPicker />
    </div>
  );
}
