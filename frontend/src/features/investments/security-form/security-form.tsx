import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Currency, type SecurityResponse, SecurityType } from "@/api/generated/model";
import { CurrencySelect } from "@/components/currency-select";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReportingCurrency } from "@/hooks/use-formatters";
import { isQuantity } from "@/lib/validation";
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
  onSubmit: (values: SecurityFormValues) => void;
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
      .max(32, t("validation.maxLength", { max: 32 })),
    name: z
      .string()
      .refine((value) => value.trim() !== "", t("validation.required"))
      .max(200, t("validation.maxLength", { max: 200 })),
    type: z.enum(SecurityType),
    currency: z.enum(Currency),
    isin: z
      .string()
      .refine(
        (value) => value.trim() === "" || ISIN_PATTERN.test(value.trim()),
        t("investments.validation.isin"),
      ),
    exchange: z.string().max(32, t("validation.maxLength", { max: 32 })),
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

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      const hasPrice = value.lastPrice.trim() !== "";

      onSubmit({
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
          <div className="space-y-1.5">
            <Label htmlFor="security-symbol">{t("investments.securities.symbol")}</Label>
            <Input
              id="security-symbol"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="VWCE"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "security-symbol-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <FieldError id="security-symbol-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="type">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="security-type">{t("investments.securities.type")}</Label>
            <SelectField
              id="security-type"
              value={field.value}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              options={securityTypes.map((type) => ({
                value: type,
                label: t(`investments.securityTypes.${type}`),
              }))}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="name">
        {(field) => (
          <div className="col-span-full space-y-1.5">
            <Label htmlFor="security-name">{t("investments.securities.name")}</Label>
            <Input
              id="security-name"
              autoComplete="off"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "security-name-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <FieldError id="security-name-error" message={field.errors[0]?.message} />
          </div>
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
          <div className="space-y-1.5">
            <Label htmlFor="security-exchange">{t("investments.securities.exchange")}</Label>
            <Input
              id="security-exchange"
              autoComplete="off"
              placeholder="XETRA"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "security-exchange-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <FieldError id="security-exchange-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="isin">
        {(field) => (
          <div className="col-span-full space-y-1.5">
            <Label htmlFor="security-isin">{t("investments.securities.isin")}</Label>
            <Input
              id="security-isin"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              placeholder="IE00BK5BQT80"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "security-isin-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <FieldError id="security-isin-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="lastPrice">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="security-last-price">{t("investments.securities.lastPrice")}</Label>
            <Input
              id="security-last-price"
              inputMode="decimal"
              placeholder="0.00"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={
                field.errors.length > 0 ? "security-last-price-error" : "security-last-price-hint"
              }
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <p id="security-last-price-hint" className="text-xs text-muted-foreground">
              {t("investments.securities.lastPriceHint")}
            </p>
            <FieldError id="security-last-price-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="lastPriceDate">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="security-last-price-date">
              {t("investments.securities.lastPriceDate")}
            </Label>
            <DatePicker
              id="security-last-price-date"
              value={field.value}
              placeholder={t("investments.securities.lastPriceDatePlaceholder")}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
          </div>
        )}
      </form.Field>

      <div className="col-span-full flex flex-wrap justify-end gap-2 pt-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        ) : null}
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={pending} disabled={!canSubmit}>
              {initial ? t("actions.save") : t("investments.securities.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
