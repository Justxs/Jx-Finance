import { useState } from "react";
import { useTranslation } from "react-i18next";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SelectField } from "@/components/select-field/select-field";
import { Section, SectionHeader } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useTodayDate } from "@/hooks/use-settings";
import { VALUE_RANGES, type ValueRange, valueHistoryParams } from "../investment-queries";
import { ValueChart } from "./index";

interface Props {
  accountId?: string;
}

export function ValueChartSection({ accountId }: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useTodayDate();
  const [range, setRange] = useState<ValueRange>("oneYear");
  const [shown, stale] = useDeferredParams({ ...valueHistoryParams(accountId, range, today) });

  return (
    <Section>
      <SectionHeader title={t("investments.valueChart.title")}>
        <SelectField
          aria-label={t("investments.valueChart.range")}
          className="w-36"
          value={range}
          onChange={setRange}
          options={VALUE_RANGES.map((value) => ({
            value,
            label: t(`investments.valueChart.ranges.${value}`),
          }))}
        />
      </SectionHeader>
      <QueryBoundary
        fallback={<Skeleton className="h-56 w-full" />}
        errorSubject={t("investments.valueChart.title")}
      >
        <StaleRegion stale={stale}>
          <ValueChart params={shown} />
        </StaleRegion>
      </QueryBoundary>
    </Section>
  );
}
