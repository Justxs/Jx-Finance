import { useDeferredValue, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCashFlowForecastSuspense } from "@/api/generated";
import type { AccountForecastResponse, ForecastEntryResponse } from "@/api/generated/model";
import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { Disclosure } from "@/components/disclosure/disclosure";
import { ForecastWhatIf, type WhatIf } from "@/components/forecast-what-if/forecast-what-if";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SelectField } from "@/components/select-field/select-field";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionHeader } from "@/components/ui/section/section";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { Tag } from "@/components/ui/tag/tag";
import { useMoney, useShortDayIso } from "@/hooks/use-formatters";
import type { Translate } from "@/lib/i18n";
import { toCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ForecastChart } from ".";
import { type ForecastRisk, forecastRisks, scheduledTotals } from "./forecast-series";

const HORIZONS = ["30", "60", "90"] as const;

type Horizon = (typeof HORIZONS)[number];

function entryName(t: Translate, entry: ForecastEntryResponse) {
  if (entry.source === "whatIf") {
    return t("forecast.whatIfEntry");
  }
  return entry.name ?? t("forecast.ledgerEntry");
}

function useRiskText() {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDay = useShortDayIso();

  return function riskText(account: AccountForecastResponse, risk: ForecastRisk) {
    const date = formatDay(risk.date);
    if (risk.kind === "withSpending") {
      return t("forecast.belowZeroWithSpending", { account: account.accountName, date });
    }
    if (!risk.entry) {
      return t("forecast.belowZeroToday", { account: account.accountName });
    }
    return t("forecast.belowZero", {
      account: account.accountName,
      date,
      entry: risk.entry.name ?? t("forecast.ledgerRows"),
      amount: money.formatSigned(Number(risk.entry.amount), "auto", account.currency),
    });
  };
}

function Warnings({
  accounts,
  days,
}: Readonly<{ accounts: AccountForecastResponse[]; days: number }>) {
  const { t } = useTranslation();
  const riskText = useRiskText();
  const sentences = accounts.flatMap((account) =>
    forecastRisks(account).map((risk) => ({
      key: `${account.accountId}-${risk.kind}`,
      text: riskText(account, risk),
    })),
  );

  if (sentences.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("forecast.noneAtRisk", { days })}</p>;
  }

  return (
    <ul className="space-y-1 text-sm font-medium text-expense">
      {sentences.map((sentence) => (
        <li key={sentence.key}>{sentence.text}</li>
      ))}
    </ul>
  );
}

function EntriesTable({
  account,
  days,
}: Readonly<{ account: AccountForecastResponse; days: number }>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDay = useShortDayIso();
  const label = t("forecast.entriesLabel", { account: account.accountName, days });

  return (
    <Table
      label={label}
      columns={["w-24", undefined, "w-32", "w-32"]}
      className="min-w-120"
      aria-label={label}
    >
      <TableHeader>
        <TableRow>
          <TableHead>{t("forecast.date")}</TableHead>
          <TableHead>{t("forecast.entry")}</TableHead>
          <TableHead numeric>{t("forecast.amount")}</TableHead>
          <TableHead numeric>{t("forecast.balanceAfter")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {account.entries.map((entry) => {
          const amount = Number(entry.amount);
          return (
            <TableRow key={`${entry.date}-${entry.billId ?? "ledger"}-${entry.balanceAfter}`}>
              <TableCell className="tabular-nums">{formatDay(entry.date)}</TableCell>
              <TableCell>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate" title={entryName(t, entry)}>
                    {entryName(t, entry)}
                  </span>
                  {entry.overdue ? <Tag tone="negative">{t("forecast.overdue")}</Tag> : null}
                </span>
              </TableCell>
              <TableCell numeric className={cn(amount > 0 && "text-income")}>
                {entry.estimated ? (
                  <>
                    <span aria-hidden="true">≈ </span>
                    <span className="sr-only">{t("forecast.estimated")} </span>
                  </>
                ) : null}
                {money.formatSigned(amount, "auto", account.currency)}
              </TableCell>
              <TableCell numeric className={cn(toCents(entry.balanceAfter) < 0 && "text-expense")}>
                {money.format(Number(entry.balanceAfter), account.currency)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

interface BodyProps {
  days: number;
  totals: boolean;
  whatIf: WhatIf | null;
  onWhatIf: (whatIf: WhatIf | null) => void;
}

function ForecastBody({ days, totals, whatIf, onWhatIf }: Readonly<BodyProps>) {
  const { t } = useTranslation();
  const money = useMoney();
  const selectId = useId();
  const forecast = useCashFlowForecastSuspense({
    days,
    whatIfAccountId: whatIf?.accountId,
    whatIfAmount: whatIf?.amount,
    whatIfDate: whatIf?.date,
  }).data;
  const [chosenId, setChosenId] = useState("");
  const account =
    forecast.accounts.find((item) => item.accountId === (whatIf?.accountId ?? chosenId)) ??
    forecast.accounts[0];

  const totalsLine = scheduledTotals(forecast);

  return (
    <div className="space-y-4">
      {totals && totalsLine.length > 0 ? (
        <p className="text-sm">
          {t("forecast.totals", {
            days,
            out: totalsLine.map((total) => money.format(total.out, total.currency)).join(" + "),
            in: totalsLine.map((total) => money.format(total.in, total.currency)).join(" + "),
          })}
        </p>
      ) : null}
      {account ? (
        <>
          <Warnings accounts={forecast.accounts} days={days} />
          {forecast.accounts.length > 1 ? (
            <div className="w-full sm:w-72">
              <SelectField
                id={selectId}
                aria-label={t("forecast.account")}
                value={account.accountId}
                onChange={setChosenId}
                options={forecast.accounts.map((item) => ({
                  value: item.accountId,
                  label: item.accountName,
                }))}
              />
            </div>
          ) : null}
          <ForecastChart
            account={account}
            from={forecast.from}
            to={forecast.to}
            ariaLabel={t("forecast.chartLabel", { account: account.accountName, days })}
          />
          {account.otherCurrencies ? (
            <p className="text-xs text-muted-foreground">
              {t("forecast.otherCurrencies", {
                account: account.accountName,
                currency: account.currency.toUpperCase(),
              })}
            </p>
          ) : null}
          <ForecastWhatIf
            accountId={account.accountId}
            accountName={account.accountName}
            currency={account.currency}
            today={forecast.from}
            whatIf={whatIf}
            onChange={onWhatIf}
          />
          <EntriesTable account={account} days={days} />
        </>
      ) : (
        <EmptyText>{t("forecast.empty", { days })}</EmptyText>
      )}
      {forecast.notCounted.length > 0 ? (
        <Disclosure summary={t("forecast.notCounted", { count: forecast.notCounted.length })}>
          <Rows>
            {forecast.notCounted.map((entry) => (
              <li
                key={entry.billId}
                className="flex items-baseline justify-between gap-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate" title={entry.name}>
                  {entry.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t(`forecast.reasons.${entry.reason}`)}
                </span>
              </li>
            ))}
          </Rows>
        </Disclosure>
      ) : null}
    </div>
  );
}

interface Props {
  totals?: boolean;
}

export function CashFlowForecast({ totals = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [horizon, setHorizon] = useState<Horizon>("90");
  const [whatIf, setWhatIf] = useState<WhatIf | null>(null);
  const days = Number(horizon);
  const shownDays = useDeferredValue(days);
  const shownWhatIf = useDeferredValue(whatIf);
  const title = t("forecast.title", { days });

  return (
    <Section aria-labelledby={titleId}>
      <SectionHeader title={<span id={titleId}>{title}</span>}>
        <div className="w-full sm:w-36">
          <SelectField<Horizon>
            size="sm"
            aria-label={t("forecast.horizon")}
            value={horizon}
            onChange={setHorizon}
            options={HORIZONS.map((value) => ({
              value,
              label: t("forecast.horizonOption", { days: Number(value) }),
            }))}
          />
        </div>
      </SectionHeader>
      <p className="mb-4 text-sm text-muted-foreground">{t("forecast.basis")}</p>
      <QueryBoundary fallback={<ChartSkeleton />} errorSubject={title}>
        <StaleRegion stale={shownDays !== days || shownWhatIf !== whatIf}>
          <ForecastBody
            days={shownDays}
            totals={totals}
            whatIf={shownWhatIf}
            onWhatIf={setWhatIf}
          />
        </StaleRegion>
      </QueryBoundary>
    </Section>
  );
}
