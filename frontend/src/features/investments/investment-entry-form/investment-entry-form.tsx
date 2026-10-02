import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useCreateInvestmentTransaction,
  useSecuritiesSuspense,
  useUpdateInvestmentTransaction,
} from "@/api/generated";
import type {
  AccountResponse,
  Currency,
  InvestmentTransactionResponse,
  InvestmentTransactionType,
  SecurityResponse,
} from "@/api/generated/model";
import { MoneyPairField, useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { type CashEffectInput, cashEffect } from "@/features/investments/cash-effect";
import {
  entryTypes,
  isTrade,
  movesHolding,
  movesNoCash,
  receivesShares,
  requiresRelatedSecurity,
  requiresSecurity,
  takesCostShare,
  usesAmount,
} from "@/features/investments/investment-types";
import { SecurityModal } from "@/features/investments/security-form/security-modal";
import { EMPTY_VALUE, useMoney } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import type { TranslationKey } from "@/lib/i18n";
import { silentMutation, upsert } from "@/lib/mutations";
import { namedOptions, optionsOf } from "@/lib/options";
import { INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { entryDefaults, entrySchema, toRequest } from "./entry-schema";
import { SecurityPicker } from "./security-picker";

interface Props {
  accounts: readonly AccountResponse[];
  accountId?: string;
  editing?: InvestmentTransactionResponse;
  onClose: () => void;
}

interface CashEffectProps {
  input: CashEffectInput;
  currency: Currency;
}

type SecurityField = "securityId" | "relatedSecurityId";

function quantityLabel(type: InvestmentTransactionType): TranslationKey {
  if (type === "split") {
    return "investments.entry.ratio";
  }

  if (type === "merger") {
    return "investments.entry.sharesGivenUp";
  }

  return type === "symbolChange" ? "investments.entry.sharesMoved" : "investments.entry.quantity";
}

function quantityHint(type: InvestmentTransactionType): TranslationKey | undefined {
  if (type === "split") {
    return "investments.entry.ratioHint";
  }

  return type === "symbolChange" ? "investments.entry.sharesMovedHint" : undefined;
}

function CashEffectLine({ input, currency }: Readonly<CashEffectProps>) {
  const { t } = useTranslation();
  const money = useMoney();
  const effectText = cashEffect(input);
  const effect = effectText === null ? null : Number(effectText);

  let text = EMPTY_VALUE;
  if (movesNoCash(input.type) || (input.type === "merger" && input.amount.trim() === "")) {
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

export function InvestmentEntryForm({ accounts, accountId, editing, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const securities = useSecuritiesSuspense().data;

  function closeWith(message: string) {
    toast.success(message);
    onClose();
  }

  const { create, update, pending, error } = upsert(
    useCreateInvestmentTransaction({
      mutation: { ...silentMutation, onSuccess: () => closeWith(t("investments.entry.saved")) },
    }),
    useUpdateInvestmentTransaction({
      mutation: { ...silentMutation, onSuccess: () => closeWith(t("investments.entry.corrected")) },
    }),
  );
  const [addingFor, setAddingFor] = useState<SecurityField | null>(null);
  const [created, setCreated] = useState<SecurityResponse[]>([]);

  const knownIds = new Set(securities.map((security) => security.id));
  const allSecurities = [...securities, ...created.filter((item) => !knownIds.has(item.id))];

  const form = useServerForm({
    defaultValues: entryDefaults({ accounts, accountId, editing, today }),
    schema: entrySchema(t),
    submit: (value) => {
      const data = toRequest(value);
      return editing ? update({ id: editing.id, data }) : create({ data });
    },
  });

  function securityCurrency(securityId: string) {
    return allSecurities.find((security) => security.id === securityId)?.currency;
  }

  function costShareField() {
    return (
      <form.Field name="costShare">
        {(field) => (
          <field.MoneyInputField
            id="entry-cost-share"
            label={t("investments.entry.costShare")}
            hint={t("investments.entry.costShareHint")}
            className="col-span-full"
            placeholder="0"
          />
        )}
      </form.Field>
    );
  }

  const costShareOnly = editing !== undefined && editing.source !== "manual";

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        {costShareOnly ? (
          <>
            <p className="col-span-full text-sm text-muted-foreground">
              {t("investments.entry.costShareOnly")}
            </p>
            {costShareField()}
          </>
        ) : (
          <>
            <form.Field name="type">
              {(field) => (
                <field.SelectFieldControl
                  id="entry-type"
                  label={t("investments.entry.type")}
                  options={optionsOf(entryTypes, (type) => t(`investments.types.${type}`))}
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
                        onAdd={() => setAddingFor("securityId")}
                      />
                    )}
                  </form.Field>

                  {movesHolding(type) ? (
                    <form.Field name="relatedSecurityId">
                      {(field) => (
                        <SecurityPicker
                          field={field}
                          securities={allSecurities}
                          required={requiresRelatedSecurity(type)}
                          id="entry-related-security"
                          label={
                            requiresRelatedSecurity(type)
                              ? t("investments.entry.relatedSecurity")
                              : t("investments.entry.receivedSecurity")
                          }
                          onAdd={() => setAddingFor("relatedSecurityId")}
                        />
                      )}
                    </form.Field>
                  ) : null}

                  {usesAmount(type) ? null : (
                    <form.Field name="quantity">
                      {(field) => {
                        const hint = quantityHint(type);

                        return (
                          <field.MoneyInputField
                            id="entry-quantity"
                            label={t(quantityLabel(type))}
                            hint={hint ? t(hint) : undefined}
                            className={hint ? "col-span-full" : undefined}
                            placeholder={type === "split" ? "2" : "0"}
                          />
                        );
                      }}
                    </form.Field>
                  )}

                  {receivesShares(type) ? (
                    <form.Subscribe selector={(state) => state.values.relatedSecurityId}>
                      {(relatedSecurityId) =>
                        relatedSecurityId === "" ? null : (
                          <form.Field name="relatedQuantity">
                            {(field) => (
                              <field.MoneyInputField
                                id="entry-related-quantity"
                                label={t("investments.entry.sharesReceived")}
                                placeholder="0"
                              />
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>
                  ) : null}

                  {type === "merger" ? (
                    <>
                      <form.Subscribe selector={(state) => state.values.securityId}>
                        {(securityId) => (
                          <form.Field name="amount">
                            {(field) => {
                              const code = securityCurrency(securityId)?.toUpperCase();

                              return (
                                <field.MoneyInputField
                                  id="entry-amount"
                                  label={
                                    code
                                      ? t("investments.entry.cashReceivedIn", { currency: code })
                                      : t("investments.entry.cashReceived")
                                  }
                                  hint={t("investments.entry.cashReceivedHint")}
                                  className="col-span-full"
                                />
                              );
                            }}
                          </form.Field>
                        )}
                      </form.Subscribe>
                      <form.Subscribe
                        selector={(state) =>
                          takesCostShare(
                            state.values.type,
                            state.values.relatedSecurityId,
                            state.values.amount,
                          )
                        }
                      >
                        {(needed) => (needed ? costShareField() : null)}
                      </form.Subscribe>
                    </>
                  ) : null}

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
          </>
        )}

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={editing ? t("actions.save") : t("investments.entry.submit")}
          onCancel={onClose}
        />

        <SecurityModal
          open={addingFor !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAddingFor(null);
            }
          }}
          onSaved={(security) => {
            setCreated((previous) => [...previous, security]);
            form.setFieldValue(addingFor ?? "securityId", security.id);
          }}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
