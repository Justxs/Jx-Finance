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
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { useIsoDate } from "@/hooks/use-formatters";
import { useSettingsSuspense } from "@/hooks/use-settings";
import { BackupSection } from "../backup-section/backup-section";
import { DiscordSection } from "../discord-section/discord-section";
import { SettingsForm } from "../settings-form/settings-form";
import { type SettingsSection, SettingsLayout } from "../settings-nav/settings-nav";
import { SmtpSection } from "../smtp-section/smtp-section";
import { SettingsFormSkeleton } from "./settings-page-pending";

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
    supportLinkEnabled: settings.supportLinkEnabled,
  };

  return (
    <SettingsForm
      section={section}
      key={JSON.stringify(editable)}
      settings={settings}
      accounts={accounts.data}
      pending={updateMutation.isPending}
      exchangeRates={exchangeRates}
      onSubmit={(values, onSaved) =>
        updateMutation.mutateAsync({ data: values }, { onSuccess: onSaved })
      }
    />
  );
}

export function SettingsPage() {
  const search = useSearch({ from: "/settings" });
  const section = search.section ?? "general";

  return (
    <SettingsLayout current={section}>
      {section === "email" ? <SmtpSection /> : null}
      {section === "discord" ? <DiscordSection /> : null}
      {section === "backups" ? <BackupSection /> : null}
      <QueryBoundary fallback={<SettingsFormSkeleton section={section} />}>
        <SettingsContent section={section} />
      </QueryBoundary>
    </SettingsLayout>
  );
}
