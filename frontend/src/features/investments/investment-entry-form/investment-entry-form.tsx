import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  type AccountResponse,
  type CreateInvestmentTransactionRequest,
  Currency,
  type InvestmentTransactionResponse,
  InvestmentTransactionType,
  type SecurityResponse,
} from "@/api/generated/model";
import { createInvestmentTransactionBodyDescriptionMax } from "@/api/schemas/investments/investments.zod";
import { MoneyPairField, useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { FieldError } from "@/components/ui/field-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Label } from "@/components/ui/label/label";
import { EMPTY_VALUE, useMoney } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { namedOptions } from "@/lib/options";
import { INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import {
  isNonNegativeMoney,
  isPositiveMoney,
  isPositiveQuantity,
  isQuantity,
  optionalText,
  requiredValue,
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
  editing?: InvestmentTransactionResponse;
  pending: boolean;
  serverError?: unknown;
  onSubmit: (values: CreateInvestmentTransactionRequest) => Promise<unknown> | void;
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
          className={cn("font-semibold tabular-nums", effect !== null && effect > 0 && INCOME_TONE)}
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
  editing,
  pending,
  serverError,
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
      accountId: requiredValue(t),
      date: requiredValue(t),
      securityId: z.string(),
      quantity: z.string(),
      price: z.string(),
      fee: z.string(),
      amount: z.string(),
      currency: z.enum(Currency),
      description: optionalText(t, createInvestmentTransactionBodyDescriptionMax),
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

  const defaultValues: FormValues = editing
    ? {
        type: editing.type,
        accountId: editing.accountId,
        date: editing.date,
        securityId: editing.securityId ?? "",
        quantity: usesAmount(editing.type) ? "" : editing.quantity,
        price: isTrade(editing.type) ? editing.price : "",
        fee: isTrade(editing.type) && Number(editing.fee) > 0 ? editing.fee : "",
        amount: usesAmount(editing.type) ? editing.cashAmount.replace(/^[-−]/, "") : "",
        currency: editing.currency,
        description: editing.description ?? "",
      }
    : {
        type: initialType,
        accountId: initialAccount?.id ?? "",
        date: today,
        securityId: "",
        quantity: "",
        price: "",
        fee: "",
        amount: "",
        currency: initialAccount?.currency ?? DEFAULT_CURRENCY,
        description: "",
      };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const trade = isTrade(value.type);
      const cash = usesAmount(value.type);
      const securityId = value.securityId || null;

      return onSubmit({
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
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="type">
          {(field) => (
            <field.SelectFieldControl
              id="entry-type"
              label={t("investments.entry.type")}
              options={entryTypes.map((type) => ({
                value: type,
                label: t(`investments.types.${type}`),
              }))}
            />
          )}
        </form.Field>

        <form.Field name="date">
          {(field) => <field.DateField id="entry-date" label={t("transactions.date")} />}
        </form.Field>

        <form.Field name="accountId">
          {(field) => (
            <field.SelectFieldControl
              id="entry-account"
              label={t("transactions.account")}
              className="col-span-full"
              options={namedOptions(accounts)}
              onValueChange={(value) => {
                const next = accounts.find((account) => account.id === value);
                if (next) {
                  form.setFieldValue("currency", next.currency);
                }
              }}
            />
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
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSecurityOpen(true)}
                        >
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
                    const split = type === "split";

                    return (
                      <field.MoneyInputField
                        id="entry-quantity"
                        label={
                          split ? t("investments.entry.ratio") : t("investments.entry.quantity")
                        }
                        hint={split ? t("investments.entry.ratioHint") : undefined}
                        className={split ? "col-span-full" : undefined}
                        placeholder={split ? "2" : "0"}
                      />
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
                          const code = securityCurrency(securityId)?.toUpperCase();

                          return (
                            <field.MoneyInputField
                              id="entry-price"
                              label={
                                code
                                  ? t("investments.entry.priceIn", { currency: code })
                                  : t("investments.entry.price")
                              }
                            />
                          );
                        }}
                      </form.Field>
                    )}
                  </form.Subscribe>

                  <form.Field name="fee">
                    {(field) => (
                      <field.MoneyInputField
                        id="entry-fee"
                        label={t("investments.entry.fee")}
                        hint={t("investments.entry.feeHint")}
                      />
                    )}
                  </form.Field>
                </>
              ) : null}

              {usesAmount(type) ? (
                <form.Subscribe selector={(state) => state.values.securityId}>
                  {(securityId) => {
                    const code = securityCurrency(securityId)?.toUpperCase();

                    if (code) {
                      return (
                        <form.Field name="amount">
                          {(field) => (
                            <field.MoneyInputField
                              id="entry-amount"
                              label={t("investments.entry.amountIn", { currency: code })}
                            />
                          )}
                        </form.Field>
                      );
                    }

                    return (
                      <MoneyPairField
                        form={form}
                        fields={{ amount: "amount", currency: "currency" }}
                        id="entry-amount"
                        label={t("transactions.amount")}
                        currencyLabel={t("investments.entry.currency")}
                      />
                    );
                  }}
                </form.Subscribe>
              ) : null}
            </>
          )}
        </form.Subscribe>

        <form.Field name="description">
          {(field) => (
            <field.TextField
              id="entry-description"
              label={t("investments.entry.note")}
              className="col-span-full"
            />
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

        <FormError error={serverError} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={editing ? t("actions.save") : t("investments.entry.submit")}
          onCancel={onCancel}
        />

        <SecurityModal
          open={securityOpen}
          onOpenChange={setSecurityOpen}
          onSaved={(security) => {
            setCreated((previous) => [...previous, security]);
            form.setFieldValue("securityId", security.id);
          }}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
