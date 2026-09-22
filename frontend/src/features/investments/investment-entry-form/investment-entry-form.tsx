import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CreateInvestmentTransactionRequest,
  Currency,
  InvestmentTransactionResponse,
  InvestmentTransactionType,
  SecurityResponse,
} from "@/api/generated/model";
import { MoneyPairField, useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { EMPTY_VALUE, useMoney } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { namedOptions } from "@/lib/options";
import { INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { type CashEffectInput, cashEffect } from "../cash-effect";
import { entryTypes, isTrade, requiresSecurity, usesAmount } from "../investment-types";
import { SecurityModal } from "../security-form";
import { entryDefaults, entrySchema, toRequest } from "./entry-schema";
import { SecurityPicker } from "./security-picker";

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

  const form = useServerForm({
    defaultValues: entryDefaults({ accounts, accountId, initialType, editing, today }),
    schema: entrySchema(t),
    submit: (value) => onSubmit(toRequest(value)),
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
                {(field) => (
                  <SecurityPicker
                    field={field}
                    securities={allSecurities}
                    required={requiresSecurity(type)}
                    onAdd={() => setSecurityOpen(true)}
                  />
                )}
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
