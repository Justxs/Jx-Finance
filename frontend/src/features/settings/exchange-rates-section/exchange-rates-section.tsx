import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteExchangeRate, useExchangeRateEntriesSuspense } from "@/api/generated";
import { Currency } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { CurrencySelect, orderCurrencies } from "@/components/currency-select/currency-select";
import { FormError } from "@/components/form-error/form-error";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { EditModal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RecordRow, RecordRowsSkeleton } from "@/components/record-row/record-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { TitledSection } from "@/components/ui/section/section";
import { ScrollRegion } from "@/components/ui/table/table";
import { Tag } from "@/components/ui/tag/tag";
import { childDelete } from "@/hooks/use-confirmed-delete";
import { useUsableCurrencies } from "@/hooks/use-currencies";
import { useEditableList } from "@/hooks/use-editable-list";
import { useIsoDate, useRateFormat } from "@/hooks/use-formatters";
import { silentMutation } from "@/lib/mutations";
import { ExchangeRateForm } from "./exchange-rate-form";

const rateCurrencies = orderCurrencies([]).filter((currency) => currency !== Currency.eur);

function RateList({ currency }: Readonly<{ currency: Currency }>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const rateFormat = useRateFormat();
  const code = currency.toUpperCase();
  const entries = useExchangeRateEntriesSuspense({ currency }).data;
  const rows = entries.map((entry) => ({ ...entry, id: entry.date }));
  const deleteMutation = useDeleteExchangeRate({ mutation: silentMutation });
  const { list, rowProps, editProps, dialogProps } = useEditableList(
    rows,
    childDelete(
      deleteMutation,
      (date) => ({ currency, date }),
      (variables) => variables.date,
    ),
    (row) => `${code} ${rateFormat.format(Number(row.rate))}, ${formatDate(row.date)}`,
  );

  return (
    <>
      <FormError error={deleteMutation.error} />
      {list.length === 0 ? (
        <EmptyText size="sm">{t("settings.rates.entries.empty", { currency: code })}</EmptyText>
      ) : (
        <ScrollRegion
          aria-label={t("settings.rates.entries.listLabel", { currency: code })}
          className="max-h-96 overflow-y-auto pr-1"
        >
          <Rows>
            {list.map((row) => {
              const props = rowProps(row);
              return (
                <RecordRow
                  key={row.id}
                  title={formatDate(row.date)}
                  subtitle={
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Tag tone={row.source === "manual" ? "accent" : "neutral"}>
                        {t(`settings.rates.source.${row.source}`)}
                      </Tag>
                      {row.syncedRate
                        ? t("settings.rates.entries.syncedRate", {
                            rate: rateFormat.format(Number(row.syncedRate)),
                          })
                        : null}
                    </span>
                  }
                  amount={rateFormat.format(Number(row.rate))}
                  label={`${code} ${formatDate(row.date)}`}
                  {...props}
                  onDelete={row.source === "manual" ? props.onDelete : undefined}
                />
              );
            })}
          </Rows>
        </ScrollRegion>
      )}
      <EditModal
        {...editProps}
        title={(row) =>
          t("settings.rates.entries.editTitle", { currency: code, date: formatDate(row.date) })
        }
      >
        {(row, close) => <ExchangeRateForm currency={currency} entry={row} onClose={close} />}
      </EditModal>
      <ConfirmDeleteDialog {...dialogProps} />
    </>
  );
}

export function ExchangeRatesSection() {
  const { t } = useTranslation();
  const usable = useUsableCurrencies();
  const [currency, setCurrency] = useState<Currency>(
    () => usable.find((candidate) => candidate !== Currency.eur) ?? Currency.usd,
  );
  const shown = useDeferredValue(currency);
  const code = currency.toUpperCase();

  return (
    <TitledSection
      title={t("settings.rates.entries.title")}
      description={t("settings.rates.entries.description")}
    >
      <div className="mt-4 flex max-w-3xl flex-wrap items-end gap-3">
        <FieldShell
          id="exchange-rates-currency"
          label={t("settings.rates.entries.currency")}
          className="w-full sm:w-72"
        >
          <CurrencySelect
            id="exchange-rates-currency"
            value={currency}
            only={rateCurrencies}
            onChange={setCurrency}
          />
        </FieldShell>
        <CreateDialog
          secondary
          label={t("settings.rates.entries.add")}
          title={t("settings.rates.entries.addTitle", { currency: code })}
        >
          {(close) => <ExchangeRateForm currency={currency} onClose={close} />}
        </CreateDialog>
      </div>
      <div className="mt-4 max-w-3xl">
        <QueryBoundary fallback={<RecordRowsSkeleton />}>
          <RateList currency={shown} />
        </QueryBoundary>
      </div>
    </TitledSection>
  );
}
