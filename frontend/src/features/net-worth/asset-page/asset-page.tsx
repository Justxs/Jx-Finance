import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAssetsSuspense } from "@/api/generated";
import type { AssetResponse } from "@/api/generated/model";
import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { PageHeader } from "@/components/page-header/page-header";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Section, TitledSection } from "@/components/ui/section/section";
import { TextLink } from "@/components/ui/text-link/text-link";
import { EMPTY_VALUE, useIsoDate, useMoney } from "@/hooks/use-formatters";
import { AssetValueChart } from "../asset-value-chart";
import { ValuationsSkeleton } from "./asset-page-pending";
import { AssetValuations } from "./asset-valuations";

interface Props {
  assetId: string;
}

export function AssetPage({ assetId }: Readonly<Props>) {
  const { t } = useTranslation();
  const asset = useAssetsSuspense().data.find((item) => item.id === assetId);

  let content: ReactNode;
  if (asset) {
    content = (
      <>
        <AssetSummary asset={asset} />
        <TitledSection title={t("netWorth.asset.chart")} bodyGap="md">
          <QueryBoundary
            fallback={<ChartSkeleton legend />}
            errorSubject={t("netWorth.asset.chart")}
          >
            <AssetValueChart assetId={asset.id} />
          </QueryBoundary>
        </TitledSection>
        <QueryBoundary
          fallback={<ValuationsSkeleton />}
          errorSubject={t("netWorth.valuations.title")}
        >
          <AssetValuations asset={asset} />
        </QueryBoundary>
      </>
    );
  } else {
    content = <EmptyText>{t("netWorth.asset.notFound")}</EmptyText>;
  }

  return (
    <div className="space-y-5">
      <p className="flex text-sm">
        <TextLink to="/net-worth" className="inline-flex items-center">
          <ArrowLeft className="mr-1 size-4" aria-hidden="true" />
          {t("netWorth.schedule.back")}
        </TextLink>
      </p>
      <PageHeader title={asset?.name ?? t("netWorth.assets")} />
      {content}
    </div>
  );
}

function AssetSummary({ asset }: Readonly<{ asset: AssetResponse }>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  function format(value: string) {
    return money.format(Number(value), asset.currency);
  }

  const stats = [
    {
      label: t("netWorth.asset.lastValuation"),
      value: format(asset.currentValue),
      detail: formatDate(asset.asOf),
    },
    {
      label: t("netWorth.asset.monthly"),
      value: asset.monthlyDepreciation ? format(asset.monthlyDepreciation) : EMPTY_VALUE,
      detail: asset.depreciation
        ? t("netWorth.asset.residual", { amount: format(asset.depreciation.residualValue) })
        : t("netWorth.asset.noDepreciation"),
    },
    {
      label: t("netWorth.asset.fullyDepreciatedOn"),
      value: asset.fullyDepreciatedOn ? formatDate(asset.fullyDepreciatedOn) : EMPTY_VALUE,
      detail: null,
    },
  ];

  return (
    <Section
      as="div"
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-end"
    >
      <dl className="min-w-0">
        <dt className="text-sm text-muted-foreground">{t("netWorth.asset.valueToday")}</dt>
        <dd className="mt-1 font-serif text-stat font-semibold lining-nums tabular-nums">
          {format(asset.value)}
        </dd>
        <dd className="mt-1.5 text-sm text-muted-foreground">
          {t(`netWorth.assetTypes.${asset.type}`)}
        </dd>
      </dl>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="mt-0.5 text-xl font-semibold wrap-break-word tabular-nums">
              {stat.value}
            </dd>
            {stat.detail ? (
              <dd className="mt-0.5 text-xs text-muted-foreground tabular-nums">{stat.detail}</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </Section>
  );
}
