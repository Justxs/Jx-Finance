import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Currency, type SecurityResponse, SecurityType } from "@/api/generated/model";
import {
  createSecurityBodyExchangeMax,
  createSecurityBodyNameMax,
  createSecurityBodySymbolMax,
} from "@/api/schemas/investments/investments.zod";
import { CurrencySelect } from "@/components/currency-select";
import { useAppForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useReportingCurrency } from "@/hooks/use-formatters";
import { submitToServer } from "@/lib/form-server-errors";
import { isQuantity, optionalText } from "@/lib/validation";
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
  onSubmit: (values: SecurityFormValues) => Promise<unknown> | void;
  onCancel?: () => void;
}

const ISIN_PATTERN = /^[A-Za-z]{2}[A-Za-z0-9]{9}\d$/;

export function SecurityForm({ initial, pending, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const reportingCurrency = useReportingCurrency();

  const schema = z.object({
    symbol: z
      .string()
      .refine((value) => value.trim() !== "", t("validation.required"))
      .max(
        createSecurityBodySymbolMax,
        t("validation.maxLength", { max: createSecurityBodySymbolMax }),
      ),
    name: z
      .string()
      .refine((value) => value.trim() !== "", t("validation.required"))
      .max(
        createSecurityBodyNameMax,
        t("validation.maxLength", { max: createSecurityBodyNameMax }),
      ),
    type: z.enum(SecurityType),
    currency: z.enum(Currency),
    isin: z
      .string()
      .refine(
        (value) => value.trim() === "" || ISIN_PATTERN.test(value.trim()),
        t("investments.validation.isin"),
      ),
    exchange: optionalText(t, createSecurityBodyExchangeMax),
    lastPrice: z
      .string()
      .refine(
        (value) => value.trim() === "" || isQuantity(value),
        t("investments.validation.price"),
      ),
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

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => {
      const { value } = submission;
      const hasPrice = value.lastPrice.trim() !== "";

      return submitToServer(submission, () =>
        onSubmit({
          symbol: value.symbol.trim().toUpperCase(),
          name: value.name.trim(),
          type: value.type,
          currency: value.currency,
          isin: value.isin.trim().toUpperCase() || null,
          exchange: value.exchange.trim() || null,
          lastPrice: hasPrice ? value.lastPrice : null,
          lastPriceDate: hasPrice && value.lastPriceDate ? value.lastPriceDate : null,
        }),
      );
    },
  });

  return (
    <form.AppForm>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        noValidate
        className="form-grid"
      >
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
            <div className="space-y-1.5">
              <Label htmlFor="security-currency">{t("investments.securities.currency")}</Label>
              <CurrencySelect
                id="security-currency"
                value={field.value}
                preferred={[reportingCurrency]}
                aria-describedby="security-currency-hint"
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
              <p id="security-currency-hint" className="text-xs text-muted-foreground">
                {t("investments.securities.currencyHint")}
              </p>
            </div>
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
              inputClassName="font-mono"
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

        <div className="col-span-full flex flex-wrap justify-end gap-2 pt-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("actions.cancel")}
            </Button>
          ) : null}
          <form.SubmitButton pending={pending}>
            {initial ? t("actions.save") : t("investments.securities.add")}
          </form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
