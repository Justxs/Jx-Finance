import { useTranslation } from "react-i18next";
import type { Currency } from "@/api/generated/model";
import { orderCurrencies } from "@/components/currency-select/currency-select";
import { defineAppFieldGroup } from "@/components/form";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useCurrencyName } from "@/hooks/use-formatters";
import { ALL_CURRENCIES } from "@/lib/currency";

const currenciesFieldGroup = defineAppFieldGroup(({ strict }) => ({
  multiCurrency: strict<boolean>(),
  reportingCurrency: strict<Currency>(),
  enabledCurrencies: strict<Currency[]>(),
}));

interface Props {
  fields: typeof currenciesFieldGroup.fields;
  savedReportingCurrency: Currency;
}

function CurrenciesFieldsGroup({ fields, savedReportingCurrency }: Readonly<Props>) {
  const { t } = useTranslation();
  const currencyName = useCurrencyName();

  return (
    <fields.Field name="reportingCurrency">
      {(reportingField) => (
        <>
          <FormGrid className="mt-4 max-w-3xl">
            <reportingField.CurrencyField
              id="settings-reporting-currency"
              all
              label={t("settings.currencies.reporting")}
              hint={
                reportingField.value === savedReportingCurrency
                  ? t("settings.currencies.reportingHint")
                  : t("settings.currencies.reportingChangeWarning")
              }
              hintRole="status"
              preferred={[savedReportingCurrency]}
            />
          </FormGrid>

          <fields.Field name="multiCurrency">
            {(multiCurrencyField) => (
              <fields.Field name="enabledCurrencies">
                {(field) => (
                  <fieldset className="mt-6 min-w-0" disabled={!multiCurrencyField.value}>
                    <legend className="text-sm font-medium">
                      {t("settings.currencies.enabled")}
                    </legend>
                    <p className="mt-1 max-w-prose text-xs text-muted-foreground">
                      {multiCurrencyField.value
                        ? t("settings.currencies.enabledHint", {
                            count: new Set([...field.value, reportingField.value]).size,
                          })
                        : t("settings.currencies.enabledOff")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => field.handleChange([...ALL_CURRENCIES])}
                      >
                        {t("settings.currencies.selectAll")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => field.handleChange([reportingField.value])}
                      >
                        {t("settings.currencies.selectNone")}
                      </Button>
                    </div>
                    <ul className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                      {orderCurrencies([reportingField.value]).map((currency) => {
                        const locked = currency === reportingField.value;
                        return (
                          <li key={currency}>
                            <label className="flex items-center gap-3 py-1.5 text-sm">
                              <Checkbox
                                checked={locked || field.value.includes(currency)}
                                disabled={locked || !multiCurrencyField.value}
                                onCheckedChange={(next) =>
                                  field.handleChange(
                                    next
                                      ? [...field.value, currency]
                                      : field.value.filter((item) => item !== currency),
                                  )
                                }
                              />
                              <span className="w-9 shrink-0 font-medium tabular-nums">
                                {currency.toUpperCase()}
                              </span>
                              <span className="min-w-0 truncate text-muted-foreground">
                                {currencyName(currency)}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                )}
              </fields.Field>
            )}
          </fields.Field>
        </>
      )}
    </fields.Field>
  );
}

export const CurrenciesFields = currenciesFieldGroup.bindComponent(CurrenciesFieldsGroup, "fields");
