import { useForm } from "@tanstack/react-form";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  type AccountResponse,
  type CreateInvestmentTransactionRequest,
  Currency,
  InvestmentTransactionType,
  type SecurityResponse,
} from "@/api/generated/model";
import { MoneyField } from "@/components/money-field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMPTY_VALUE, useMoney } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import {
  isNonNegativeMoney,
  isPositiveMoney,
  isPositiveQuantity,
  isQuantity,
} from "@/lib/validation";
import { type CashEffectInput, cashEffect } from "../cash-effect";
import {
  defaultInvestmentAccount,
  entryTypes,
  isTrade,
  requiresSecurity,
  usesAmount,
} from "../investment-types";
import { SecurityModal } from "../security-form";

interface FormValues {
  type: InvestmentTransactionType;
  accountId: string;
  date: string;
  securityId: string;
  quantity: string;
  price: string;
  fee: string;
  amount: string;
  currency: Currency;
  description: string;
}

interface Props {
  accounts: readonly AccountResponse[];
  securities: readonly SecurityResponse[];
  accountId?: string;
  initialType?: InvestmentTransactionType;
  pending: boolean;
  onSubmit: (values: CreateInvestmentTransactionRequest) => void;
  onCancel?: () => void;
}

interface CashEffectProps {
  input: CashEffectInput;
  currency: Currency;
}

function CashEffectLine({ input, currency }: Readonly<CashEffectProps>) {
  const { t } = useTranslation();
  const money = useMoney();
  const effectText = cashEffect(input);
  const effect = effectText === null ? null : Number(effectText);

  let text = EMPTY_VALUE;
  if (input.type === "split") {
    text = t("investments.entry.noCash");
  } else if (effect !== null) {
    text = money.formatSigned(effect, "auto", currency);
  }

  return (
    <dl className="col-span-full border-y border-rule py-2.5 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{t("investments.entry.cashEffect")}</dt>
        <dd
          className={cn(
            "font-semibold tabular-nums",
            effect !== null && effect > 0 && "text-income",
          )}
        >
          {text}
        </dd>
      </div>
    </dl>
  );
}

export function InvestmentEntryForm({
  accounts,
  securities,
  accountId,
  initialType = "buy",
  pending,
  onSubmit,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const [securityOpen, setSecurityOpen] = useState(false);
  const [created, setCreated] = useState<SecurityResponse[]>([]);

  const knownIds = new Set(securities.map((security) => security.id));
  const allSecurities = [...securities, ...created.filter((item) => !knownIds.has(item.id))];

  const schema = z
    .object({
      type: z.enum(InvestmentTransactionType),
      accountId: z.string().min(1, t("validation.required")),
      date: z.string().min(1, t("validation.required")),
      securityId: z.string(),
      quantity: z.string(),
      price: z.string(),
      fee: z.string(),
      amount: z.string(),
      currency: z.enum(Currency),
      description: z.string().max(500, t("validation.maxLength", { max: 500 })),
    })
    .superRefine((value, context) => {
      function fail(path: keyof FormValues, message: string) {
        context.addIssue({ code: "custom", path: [path], message });
      }

      if (requiresSecurity(value.type) && value.securityId === "") {
        fail("securityId", t("investments.validation.security"));
      }
      if (isTrade(value.type)) {
        if (!isPositiveQuantity(value.quantity)) {
          fail("quantity", t("investments.validation.quantity"));
        }
        if (!isQuantity(value.price)) {
          fail("price", t("investments.validation.price"));
        }
        if (value.fee.trim() !== "" && !isNonNegativeMoney(value.fee)) {
          fail("fee", t("validation.money"));
        }
      }
      if (value.type === "split" && !isPositiveQuantity(value.quantity)) {
        fail("quantity", t("investments.validation.ratio"));
      }
      if (usesAmount(value.type) && !isPositiveMoney(value.amount)) {
        fail("amount", t("validation.positiveMoney"));
      }
    });

  const initialAccount = defaultInvestmentAccount(accounts, accountId);

  const defaultValues: FormValues = {
    type: initialType,
    accountId: initialAccount?.id ?? "",
    date: today,
    securityId: "",
    quantity: "",
    price: "",
    fee: "",
    amount: "",
    currency: initialAccount?.currency ?? "eur",
    description: "",
  };

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      const trade = isTrade(value.type);
      const cash = usesAmount(value.type);
      const securityId = value.securityId || null;

      onSubmit({
        accountId: value.accountId,
        type: value.type,
        date: value.date,
        securityId,
        quantity: cash ? null : value.quantity,
        price: trade ? value.price : null,
        fee: trade && value.fee.trim() !== "" ? value.fee : null,
        amount: cash ? value.amount : null,
        currency: cash && securityId === null ? value.currency : null,
        description: value.description.trim() || null,
      });
    },
  });

  function securityCurrency(securityId: string) {
    return allSecurities.find((security) => security.id === securityId)?.currency;
  }

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
      <form.Field name="type">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="entry-type">{t("investments.entry.type")}</Label>
            <SelectField
              id="entry-type"
              value={field.value}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              options={entryTypes.map((type) => ({
                value: type,
                label: t(`investments.types.${type}`),
              }))}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="date">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="entry-date">{t("transactions.date")}</Label>
            <DatePicker
              id="entry-date"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "entry-date-error" : undefined}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
            <FieldError id="entry-date-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="accountId">
        {(field) => (
          <div className="col-span-full space-y-1.5">
            <Label htmlFor="entry-account">{t("transactions.account")}</Label>
            <SelectField
              id="entry-account"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "entry-account-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(value) => {
                field.handleChange(value);
                const next = accounts.find((account) => account.id === value);
                if (next) {
                  form.setFieldValue("currency", next.currency);
                }
              }}
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
            />
            <FieldError id="entry-account-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.type}>
        {(type) => (
          <>
            <form.Field name="securityId">
              {(field) => {
                const error = field.errors[0]?.message;

                return (
                  <div className="col-span-full space-y-1.5">
                    <Label htmlFor="entry-security">
                      {requiresSecurity(type)
                        ? t("investments.entry.security")
                        : t("investments.entry.securityOptional")}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <div className="min-w-48 flex-1">
                        <SelectField
                          id="entry-security"
                          value={field.value}
                          placeholder={t("investments.entry.chooseSecurity")}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? "entry-security-error" : undefined}
                          onBlur={field.handleBlur}
                          onChange={field.handleChange}
                          options={[
                            ...(requiresSecurity(type)
                              ? []
                              : [{ value: "", label: t("investments.entry.noSecurity") }]),
                            ...allSecurities.map((security) => ({
                              value: security.id,
                              label: `${security.symbol} · ${security.name}`,
                            })),
                          ]}
                        />
                      </div>
                      <Button type="button" variant="outline" onClick={() => setSecurityOpen(true)}>
                        <Plus />
                        {t("investments.securities.add")}
                      </Button>
                    </div>
                    <FieldError id="entry-security-error" message={error} />
                  </div>
                );
              }}
            </form.Field>

            {usesAmount(type) ? null : (
              <form.Field name="quantity">
                {(field) => {
                  const error = field.errors[0]?.message;
                  const split = type === "split";
                  const hintId = split ? "entry-quantity-hint" : undefined;

                  return (
                    <div className={cn("space-y-1.5", split && "col-span-full")}>
                      <Label htmlFor="entry-quantity">
                        {split ? t("investments.entry.ratio") : t("investments.entry.quantity")}
                      </Label>
                      <Input
                        id="entry-quantity"
                        inputMode="decimal"
                        placeholder={split ? "2" : "0"}
                        value={field.value}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "entry-quantity-error" : hintId}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                      {split ? (
                        <p id="entry-quantity-hint" className="text-xs text-muted-foreground">
                          {t("investments.entry.ratioHint")}
                        </p>
                      ) : null}
                      <FieldError id="entry-quantity-error" message={error} />
                    </div>
                  );
                }}
              </form.Field>
            )}

            {isTrade(type) ? (
              <>
                <form.Subscribe selector={(state) => state.values.securityId}>
                  {(securityId) => (
                    <form.Field name="price">
                      {(field) => {
                        const error = field.errors[0]?.message;
                        const code = securityCurrency(securityId)?.toUpperCase();

                        return (
                          <div className="space-y-1.5">
                            <Label htmlFor="entry-price">
                              {code
                                ? t("investments.entry.priceIn", { currency: code })
                                : t("investments.entry.price")}
                            </Label>
                            <Input
                              id="entry-price"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={field.value}
                              aria-invalid={Boolean(error)}
                              aria-describedby={error ? "entry-price-error" : undefined}
                              onBlur={field.handleBlur}
                              onChange={(event) => field.handleChange(event.target.value)}
                            />
                            <FieldError id="entry-price-error" message={error} />
                          </div>
                        );
                      }}
                    </form.Field>
                  )}
                </form.Subscribe>

                <form.Field name="fee">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="entry-fee">{t("investments.entry.fee")}</Label>
                      <Input
                        id="entry-fee"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={field.value}
                        aria-invalid={field.errors.length > 0}
                        aria-describedby={
                          field.errors.length > 0 ? "entry-fee-error" : "entry-fee-hint"
                        }
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                      <p id="entry-fee-hint" className="text-xs text-muted-foreground">
                        {t("investments.entry.feeHint")}
                      </p>
                      <FieldError id="entry-fee-error" message={field.errors[0]?.message} />
                    </div>
                  )}
                </form.Field>
              </>
            ) : null}

            {usesAmount(type) ? (
              <form.Subscribe selector={(state) => state.values.securityId}>
                {(securityId) => (
                  <form.Field name="amount">
                    {(field) => {
                      const error = field.errors[0]?.message;
                      const code = securityCurrency(securityId)?.toUpperCase();

                      if (code) {
                        return (
                          <div className="space-y-1.5">
                            <Label htmlFor="entry-amount">
                              {t("investments.entry.amountIn", { currency: code })}
                            </Label>
                            <Input
                              id="entry-amount"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={field.value}
                              aria-invalid={Boolean(error)}
                              aria-describedby={error ? "entry-amount-error" : undefined}
                              onBlur={field.handleBlur}
                              onChange={(event) => field.handleChange(event.target.value)}
                            />
                            <FieldError id="entry-amount-error" message={error} />
                          </div>
                        );
                      }

                      return (
                        <form.Field name="currency">
                          {(currencyField) => (
                            <MoneyField
                              id="entry-amount"
                              label={t("transactions.amount")}
                              value={field.value}
                              error={error}
                              onBlur={field.handleBlur}
                              onChange={field.handleChange}
                              currency={currencyField.value}
                              currencyLabel={t("investments.entry.currency")}
                              onCurrencyChange={currencyField.handleChange}
                            />
                          )}
                        </form.Field>
                      );
                    }}
                  </form.Field>
                )}
              </form.Subscribe>
            ) : null}
          </>
        )}
      </form.Subscribe>

      <form.Field name="description">
        {(field) => (
          <div className="col-span-full space-y-1.5">
            <Label htmlFor="entry-description">{t("investments.entry.note")}</Label>
            <Input
              id="entry-description"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "entry-description-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <FieldError id="entry-description-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => ({
          type: state.values.type,
          quantity: state.values.quantity,
          price: state.values.price,
          fee: state.values.fee,
          amount: state.values.amount,
          securityId: state.values.securityId,
          currency: state.values.currency,
        })}
      >
        {({ securityId, currency, ...input }) => (
          <CashEffectLine input={input} currency={securityCurrency(securityId) ?? currency} />
        )}
      </form.Subscribe>

      <div className="col-span-full flex flex-wrap justify-end gap-2 pt-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        ) : null}
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={pending} disabled={!canSubmit}>
              {t("investments.entry.submit")}
            </Button>
          )}
        </form.Subscribe>
      </div>

      <SecurityModal
        open={securityOpen}
        onOpenChange={setSecurityOpen}
        onSaved={(security) => {
          setCreated((previous) => [...previous, security]);
          form.setFieldValue("securityId", security.id);
        }}
      />
    </form>
  );
}
