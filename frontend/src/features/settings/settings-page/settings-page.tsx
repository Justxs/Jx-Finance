import { useSearch } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAccountsSuspense, useSyncExchangeRates } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { type SettingsSection, SettingsLayout } from "@/components/settings-layout/settings-layout";
import { Button } from "@/components/ui/button/button";
import { RuledLine } from "@/components/ui/ruled-line/ruled-line";
import { BackupSection } from "@/features/settings/backup-section/backup-section";
import { ExchangeRatesSection } from "@/features/settings/exchange-rates-section/exchange-rates-section";
import { ImportInboxSection } from "@/features/settings/import-inbox-section/import-inbox-section";
import { MarketPricesSection } from "@/features/settings/market-prices-section/market-prices-section";
import { NotificationProvidersSection } from "@/features/settings/notification-providers-section/notification-providers-section";
import { SettingsForm } from "@/features/settings/settings-form/settings-form";
import { useIsoDate } from "@/hooks/use-formatters";
import { useSettingsSuspense } from "@/hooks/use-settings";
import type { TranslationKey } from "@/lib/i18n";
import { SettingsFormSkeleton } from "./settings-page-pending";

function SettingsContent({ section }: Readonly<{ section: SettingsSection }>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const settings = useSettingsSuspense();
  const accounts = useAccountsSuspense();

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
    <RuledLine className="mt-5 flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-3">
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
    </RuledLine>
  );

  return (
    <SettingsForm
      section={section}
      settings={settings}
      accounts={accounts.data}
      exchangeRates={exchangeRates}
    />
  );
}

function sectionTitleKey(section: SettingsSection): TranslationKey {
  return section === "backups" ? "backup.title" : `settings.${section}.title`;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/settings" });
  const section = search.section ?? "general";

  return (
    <SettingsLayout current={section}>
      {section === "notificationProviders" ? <NotificationProvidersSection /> : null}
      {section === "marketPrices" ? <MarketPricesSection /> : null}
      {section === "importInbox" ? <ImportInboxSection /> : null}
      {section === "backups" ? <BackupSection /> : null}
      <QueryBoundary
        fallback={<SettingsFormSkeleton section={section} />}
        errorSubject={t(sectionTitleKey(section))}
      >
        <SettingsContent section={section} />
      </QueryBoundary>
      {section === "currencies" ? <ExchangeRatesSection /> : null}
    </SettingsLayout>
  );
}
