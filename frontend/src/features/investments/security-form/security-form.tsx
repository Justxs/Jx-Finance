import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  getMarketPriceSettingsSuspenseQueryOptions,
  useCreateSecurity,
  useMeSuspense,
  useUpdateSecurity,
} from "@/api/generated";
import { Currency, PriceSource, type SecurityResponse, SecurityType } from "@/api/generated/model";
import {
  createSecurityBodyExchangeMax,
  createSecurityBodyNameMax,
  createSecurityBodyPriceSymbolMax,
  createSecurityBodySymbolMax,
} from "@/api/schemas/investments/investments.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { securityTypes } from "@/features/investments/investment-types";
import { useReportingCurrency } from "@/hooks/use-currencies";
import { silentMutation, upsert } from "@/lib/mutations";
import { optionsOf } from "@/lib/options";
import { UserRole } from "@/lib/user-role";
import { optionalQuantity, optionalText, requiredText } from "@/lib/validation";
import { PriceSymbolFinder } from "./price-symbol-finder";

interface FormValues {
  symbol: string;
  name: string;
  type: SecurityType;
  currency: Currency;
  isin: string;
  exchange: string;
  lastPrice: string;
  lastPriceDate: string;
  priceSource: PriceSource;
  priceSymbol: string;
}

interface Props {
  initial?: SecurityResponse;
  onClose: () => void;
  onSaved?: (security: SecurityResponse) => void;
}

const ISIN_PATTERN = /^[A-Za-z]{2}[A-Za-z0-9]{9}\d$/;

function priceSources(type: SecurityType, currency: Currency): PriceSource[] {
  return type === "crypto" && currency === "eur" ? ["none", "eodhd", "kraken"] : ["none", "eodhd"];
}

export function SecurityForm({ initial, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const reportingCurrency = useReportingCurrency();
  const isAdmin = useMeSuspense().data.role === UserRole.admin;
  const marketPrices = useQuery({
    ...getMarketPriceSettingsSuspenseQueryOptions(),
    enabled: isAdmin,
  });

  function handleSaved(saved: SecurityResponse) {
    onSaved?.(saved);
    onClose();
  }

  const { create, update, pending, error } = upsert(
    useCreateSecurity({ mutation: { ...silentMutation, onSuccess: handleSaved } }),
    useUpdateSecurity({ mutation: { ...silentMutation, onSuccess: handleSaved } }),
  );

  const schema = z
    .object({
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
      priceSource: z.enum(PriceSource),
      priceSymbol: optionalText(t, createSecurityBodyPriceSymbolMax),
    })
    .refine((value) => value.priceSource === "none" || value.priceSymbol.trim() !== "", {
      message: t("validation.required"),
      path: ["priceSymbol"],
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
    priceSource: initial?.priceSource ?? "none",
    priceSymbol: initial?.priceSymbol ?? "",
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const hasPrice = value.lastPrice.trim() !== "";

      const data = {
        symbol: value.symbol.trim().toUpperCase(),
        name: value.name.trim(),
        type: value.type,
        currency: value.currency,
        isin: value.isin.trim().toUpperCase() || null,
        exchange: value.exchange.trim() || null,
        lastPrice: hasPrice ? value.lastPrice : null,
        lastPriceDate: hasPrice && value.lastPriceDate ? value.lastPriceDate : null,
        priceSource: value.priceSource,
        priceSymbol: value.priceSource === "none" ? null : value.priceSymbol.trim().toUpperCase(),
      };

      return initial ? update({ id: initial.id, data }) : create({ data });
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
              options={optionsOf(securityTypes, (type) => t(`investments.securityTypes.${type}`))}
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

        {isAdmin ? (
          <form.Subscribe
            selector={(state) =>
              [state.values.type, state.values.currency, state.values.priceSource] as const
            }
          >
            {([type, currency, source]) => (
              <>
                <form.Field name="priceSource">
                  {(field) => (
                    <field.SelectFieldControl
                      id="security-price-source"
                      label={t("investments.priceSource.label")}
                      options={optionsOf(priceSources(type, currency), (item) =>
                        t(`investments.priceSource.${item}`),
                      )}
                    />
                  )}
                </form.Field>
                {source === "none" ? null : (
                  <form.Field name="priceSymbol">
                    {(field) => (
                      <field.TextField
                        id="security-price-symbol"
                        label={t("investments.priceSource.symbol")}
                        hint={t("investments.priceSource.symbolHint")}
                        monospace
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={source === "kraken" ? "XBTEUR" : "VWCE.XETRA"}
                      />
                    )}
                  </form.Field>
                )}
                {source === "eodhd" && initial ? (
                  <PriceSymbolFinder
                    securityId={initial.id}
                    disabled={!initial.isin || marketPrices.data?.hasKey !== true}
                    onChoose={(symbol) => form.setFieldValue("priceSymbol", symbol)}
                  />
                ) : null}
              </>
            )}
          </form.Subscribe>
        ) : null}

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={initial ? t("actions.save") : t("investments.securities.add")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
