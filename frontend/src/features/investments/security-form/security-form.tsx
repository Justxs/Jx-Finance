import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Currency, type SecurityResponse, SecurityType } from "@/api/generated/model";
import {
  createSecurityBodyExchangeMax,
  createSecurityBodyNameMax,
  createSecurityBodySymbolMax,
} from "@/api/schemas/investments/investments.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useReportingCurrency } from "@/hooks/use-formatters";
import { optionalQuantity, optionalText, requiredText } from "@/lib/validation";
import { securityTypes } from "../investment-types";

export interface SecurityFormValues {
  symbol: string;
  name: string;
  type: SecurityType;
  currency: Currency;
  isin: string | null;
  exchange: string | null;
  lastPrice: string | null;
  lastPriceDate: string | null;
}

interface FormValues {
  symbol: string;
  name: string;
  type: SecurityType;
  currency: Currency;
  isin: string;
  exchange: string;
  lastPrice: string;
  lastPriceDate: string;
}

interface Props {
  initial?: SecurityResponse;
  pending: boolean;
  error?: unknown;
  onSubmit: (values: SecurityFormValues) => Promise<unknown> | void;
  onCancel?: () => void;
}

const ISIN_PATTERN = /^[A-Za-z]{2}[A-Za-z0-9]{9}\d$/;

export function SecurityForm({ initial, pending, error, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const reportingCurrency = useReportingCurrency();

  const schema = z.object({
    symbol: requiredText(t, createSecurityBodySymbolMax),
    name: requiredText(t, createSecurityBodyNameMax),
    type: z.enum(SecurityType),
    currency: z.enum(Currency),
    isin: z
      .string()
      .refine(
        (value) => value.trim() === "" || ISIN_PATTERN.test(value.trim()),
        t("investments.validation.isin"),
      ),
    exchange: optionalText(t, createSecurityBodyExchangeMax),
    lastPrice: optionalQuantity(t, "investments.validation.price"),
    lastPriceDate: z.string(),
  });

  const defaultValues: FormValues = {
    symbol: initial?.symbol ?? "",
    name: initial?.name ?? "",
    type: initial?.type ?? "etf",
    currency: initial?.currency ?? reportingCurrency,
    isin: initial?.isin ?? "",
    exchange: initial?.exchange ?? "",
    lastPrice: initial?.lastPrice ?? "",
    lastPriceDate: initial?.lastPriceDate ?? "",
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const hasPrice = value.lastPrice.trim() !== "";

      return onSubmit({
        symbol: value.symbol.trim().toUpperCase(),
        name: value.name.trim(),
        type: value.type,
        currency: value.currency,
        isin: value.isin.trim().toUpperCase() || null,
        exchange: value.exchange.trim() || null,
        lastPrice: hasPrice ? value.lastPrice : null,
        lastPriceDate: hasPrice && value.lastPriceDate ? value.lastPriceDate : null,
      });
    },
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="symbol">
          {(field) => (
            <field.TextField
              id="security-symbol"
              label={t("investments.securities.symbol")}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="VWCE"
            />
          )}
        </form.Field>

        <form.Field name="type">
          {(field) => (
            <field.SelectFieldControl
              id="security-type"
              label={t("investments.securities.type")}
              options={securityTypes.map((type) => ({
                value: type,
                label: t(`investments.securityTypes.${type}`),
              }))}
            />
          )}
        </form.Field>

        <form.Field name="name">
          {(field) => (
            <field.TextField
              id="security-name"
              label={t("investments.securities.name")}
              className="col-span-full"
              autoComplete="off"
            />
          )}
        </form.Field>

        <form.Field name="currency">
          {(field) => (
            <field.CurrencyField
              id="security-currency"
              label={t("investments.securities.currency")}
              hint={t("investments.securities.currencyHint")}
              preferred={[reportingCurrency]}
            />
          )}
        </form.Field>

        <form.Field name="exchange">
          {(field) => (
            <field.TextField
              id="security-exchange"
              label={t("investments.securities.exchange")}
              autoComplete="off"
              placeholder="XETRA"
            />
          )}
        </form.Field>

        <form.Field name="isin">
          {(field) => (
            <field.TextField
              id="security-isin"
              label={t("investments.securities.isin")}
              className="col-span-full"
              monospace
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="IE00BK5BQT80"
            />
          )}
        </form.Field>

        <form.Field name="lastPrice">
          {(field) => (
            <field.MoneyInputField
              id="security-last-price"
              label={t("investments.securities.lastPrice")}
              hint={t("investments.securities.lastPriceHint")}
            />
          )}
        </form.Field>

        <form.Field name="lastPriceDate">
          {(field) => (
            <field.DateField
              id="security-last-price-date"
              label={t("investments.securities.lastPriceDate")}
              placeholder={t("investments.securities.lastPriceDatePlaceholder")}
            />
          )}
        </form.Field>

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={initial ? t("actions.save") : t("investments.securities.add")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
