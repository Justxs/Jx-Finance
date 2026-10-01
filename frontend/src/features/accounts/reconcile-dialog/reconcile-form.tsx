import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  getReconciliationPreviewSuspenseQueryOptions,
  useRecordReconciliation,
} from "@/api/generated";
import { type AccountResponse, Currency } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Rows } from "@/components/ui/rows/rows";
import { TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { TextLink } from "@/components/ui/text-link/text-link";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { useToday, useTodayDate } from "@/hooks/use-settings";
import { monthBounds, parseIso, previousMonth, toIso } from "@/lib/calendar";
import { toCents } from "@/lib/money";
import { optionsOf } from "@/lib/options";
import { silentQuery } from "@/lib/query-client";
import { INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { isMoney, money, normalizeMoney, requiredValue } from "@/lib/validation";

function dayAfter(iso: string) {
  const date = parseIso(iso);
  return date
    ? toIso(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1))
    : undefined;
}

interface PreviewProps {
  account: AccountResponse;
  currency: Currency;
  date: string;
  balance: string;
  today: string;
}

function ReconcilePreview({ account, currency, date, balance, today }: Readonly<PreviewProps>) {
  const { t } = useTranslation();
  const formatMoney = useMoney();
  const formatDate = useIsoDate();
  const valid = parseIso(date) !== null && date <= today;
  const preview = useQuery({
    ...getReconciliationPreviewSuspenseQueryOptions(account.id, { date, currency }),
    ...silentQuery,
    enabled: valid,
    placeholderData: keepPreviousData,
  });

  if (!valid) {
    return null;
  }
  if (preview.isError) {
    return <p className="text-sm text-expense">{t("accounts.reconcile.previewFailed")}</p>;
  }
  if (!preview.data) {
    return <TextSkeleton size="sm" width="w-64" />;
  }

  const { ledgerBalance, previous, rows, rowCount } = preview.data;
  const difference = isMoney(balance) ? toCents(balance) - toCents(ledgerBalance) : null;
  const magnitude = formatMoney.format(Math.abs(difference ?? 0) / 100, preview.data.currency);
  const hidden = rowCount - rows.length;

  let verdict: string | null = null;
  if (difference === 0) {
    verdict = t("accounts.reconcile.matches");
  } else if (difference !== null) {
    verdict = t(difference > 0 ? "accounts.reconcile.more" : "accounts.reconcile.less", {
      amount: magnitude,
    });
  }

  return (
    <div
      className={cn("space-y-3 border-t pt-4 text-sm", preview.isPlaceholderData && "opacity-60")}
      aria-busy={preview.isPlaceholderData}
    >
      <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 tabular-nums">
        <span>
          {t("accounts.reconcile.ledger", {
            date: formatDate(preview.data.date),
            amount: formatMoney.format(Number(ledgerBalance), preview.data.currency),
          })}
        </span>
        {verdict ? (
          <span
            role="status"
            className={difference === 0 ? INCOME_TONE : "font-medium text-expense"}
          >
            {verdict}
          </span>
        ) : null}
      </p>
      <div>
        <h3 className="text-xs font-medium text-muted-foreground">
          {previous
            ? t("accounts.reconcile.rowsSince", { date: formatDate(previous.date) })
            : t("accounts.reconcile.rowsAll", { date: formatDate(preview.data.date) })}
        </h3>
        {rows.length === 0 ? (
          <EmptyText size="sm">{t("accounts.reconcile.noRows")}</EmptyText>
        ) : (
          <Rows>
            {rows.map((row) => (
              <li
                key={`${row.kind}-${row.id}`}
                className="flex items-baseline justify-between gap-3 py-1.5"
              >
                <span className="min-w-0 truncate">
                  <span className="mr-2 text-muted-foreground tabular-nums">
                    {formatDate(row.date)}
                  </span>
                  {row.description ?? t(`accounts.reconcile.kinds.${row.kind}`)}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap tabular-nums",
                    Number(row.amount) > 0 && INCOME_TONE,
                  )}
                >
                  {formatMoney.formatSigned(Number(row.amount), "auto", preview.data.currency)}
                </span>
              </li>
            ))}
          </Rows>
        )}
        <p className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 text-xs text-muted-foreground">
          <span>{hidden > 0 ? t("accounts.reconcile.moreRows", { count: hidden }) : null}</span>
          <TextLink
            to="/transactions"
            search={{
              page: 1,
              accountId: account.id,
              dateFrom: previous ? dayAfter(previous.date) : undefined,
              dateTo: preview.data.date,
            }}
          >
            {t("accounts.reconcile.openLedger")}
          </TextLink>
        </p>
      </div>
    </div>
  );
}

interface Props {
  account: AccountResponse;
  onClose: () => void;
}

export function ReconcileForm({ account, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const statementDate = monthBounds(previousMonth(useTodayDate())).dateTo;
  const held = [...new Set([account.currency, ...account.balances.map((entry) => entry.currency)])];
  const mutation = useRecordReconciliation({
    mutation: {
      onSuccess: onClose,
      meta: { silent: true, success: t("accounts.reconcile.saved") },
    },
  });

  const schema = z.object({
    date: requiredValue(t).refine(
      (value) => value <= today,
      t("serverErrors.reconciliation.futureDate"),
    ),
    balance: money(t),
    currency: z.enum(Currency),
  });

  const form = useServerForm({
    defaultValues: { date: statementDate, balance: "", currency: account.currency },
    schema,
    submit: (value) =>
      mutation.mutateAsync({
        id: account.id,
        data: {
          date: value.date,
          balance: normalizeMoney(value.balance),
          currency: value.currency,
        },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <FormGrid>
          {held.length > 1 ? (
            <form.Field name="currency">
              {(field) => (
                <field.SelectFieldControl
                  id="reconcile-currency"
                  label={t("accounts.reconcile.currency")}
                  options={optionsOf(held, (currency) => currency.toUpperCase())}
                />
              )}
            </form.Field>
          ) : null}
          <form.Field name="date">
            {(field) => (
              <field.DateField id="reconcile-date" label={t("accounts.reconcile.date")} />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.values.currency}>
            {(currency) => (
              <form.Field name="balance">
                {(field) => (
                  <field.MoneyInputField
                    id="reconcile-balance"
                    label={t("accounts.reconcile.balance", { currency: currency.toUpperCase() })}
                  />
                )}
              </form.Field>
            )}
          </form.Subscribe>
        </FormGrid>

        <form.Subscribe
          selector={(state) =>
            [state.values.currency, state.values.date, state.values.balance] as const
          }
        >
          {([currency, date, balance]) => (
            <ReconcilePreview
              account={account}
              currency={currency}
              date={date}
              balance={balance}
              today={today}
            />
          )}
        </form.Subscribe>

        <FormError error={mutation.error} />

        <form.FormActions
          pending={mutation.isPending}
          submitLabel={t("accounts.reconcile.save")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
