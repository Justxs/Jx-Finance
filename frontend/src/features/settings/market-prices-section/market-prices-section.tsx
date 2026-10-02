import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useMarketPriceSettingsSuspense, useSyncMarketPrices } from "@/api/generated";
import type { MarketPriceSettingsResponse } from "@/api/generated/model";
import { FormError } from "@/components/form-error/form-error";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { RuledLine } from "@/components/ui/ruled-line/ruled-line";
import { TitledSection } from "@/components/ui/section/section";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { MarketPricesFormSkeleton } from "@/features/settings/settings-page/settings-page-pending";
import { useDateTime, useNumberFormat } from "@/hooks/use-formatters";
import { silentMutation } from "@/lib/mutations";
import { MarketPricesForm } from "./market-prices-form";

function FetchStatus({ settings }: Readonly<{ settings: MarketPriceSettingsResponse }>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();
  const count = useNumberFormat();
  const syncMutation = useSyncMarketPrices({
    mutation: {
      ...silentMutation,
      onSuccess: (result) => {
        toast.success(
          t("settings.marketPrices.fetched", {
            checked: count.format(result.checked),
            written: count.format(result.written),
            failed: count.format(result.failed),
          }),
        );
      },
    },
  });

  return (
    <div className="mt-5 max-w-3xl space-y-3">
      <RuledLine className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p>
          <span className="text-muted-foreground">{t("settings.marketPrices.lastRun")}</span>{" "}
          <span className="font-semibold tabular-nums">
            {settings.lastRunAt
              ? formatDateTime(settings.lastRunAt)
              : t("settings.marketPrices.never")}
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">{t("settings.marketPrices.callsLeft")}</span>{" "}
          <span className="font-semibold tabular-nums">{count.format(settings.callsLeft)}</span>
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
          {t("settings.marketPrices.fetchNow")}
        </Button>
      </RuledLine>
      <FormError error={syncMutation.error} />
    </div>
  );
}

function Failures({ settings }: Readonly<{ settings: MarketPriceSettingsResponse }>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();

  return (
    <div className="mt-6 max-w-3xl">
      <h3 className="text-sm font-semibold">{t("settings.marketPrices.failures")}</h3>
      {settings.failures.length === 0 ? (
        <EmptyText size="sm">{t("settings.marketPrices.noFailures")}</EmptyText>
      ) : (
        <div className="mt-2">
          <Table label={t("settings.marketPrices.failures")} className="min-w-120">
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.marketPrices.security")}</TableHead>
                <TableHead>{t("settings.marketPrices.reason")}</TableHead>
                <TableHead>{t("settings.marketPrices.at")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.failures.map((failure) => (
                <TableRow key={failure.securityId}>
                  <TableCell>
                    <span className="font-medium">{failure.symbol}</span>
                    <span className="block text-xs text-muted-foreground">{failure.name}</span>
                  </TableCell>
                  <TableCell className="whitespace-normal">{failure.reason}</TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(failure.at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function MarketPriceSettings() {
  const { t } = useTranslation();
  const settings = useMarketPriceSettingsSuspense().data;

  return (
    <>
      <MarketPricesForm settings={settings} />
      <FetchStatus settings={settings} />
      <Failures settings={settings} />
      <p className="mt-6 max-w-prose text-sm text-muted-foreground">
        {t("settings.marketPrices.privacy")}
      </p>
    </>
  );
}

export function MarketPricesSection() {
  const { t } = useTranslation();

  return (
    <TitledSection
      title={t("settings.marketPrices.title")}
      description={t("settings.marketPrices.description")}
    >
      <QueryBoundary
        fallback={<MarketPricesFormSkeleton />}
        errorSubject={t("settings.marketPrices.title")}
      >
        <MarketPriceSettings />
      </QueryBoundary>
    </TitledSection>
  );
}
