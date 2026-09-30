import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useAccountsSuspense, useCreateSettlement } from "@/api/generated";
import {
  type AccountResponse,
  Currency,
  type HouseholdResponse,
  type SuggestedPaymentResponse,
} from "@/api/generated/model";
import { createSettlementBodyNoteMax } from "@/api/schemas/households/households.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useReportingCurrency } from "@/hooks/use-currencies";
import { useToday } from "@/hooks/use-settings";
import { silentMutation } from "@/lib/mutations";
import { namedOptions } from "@/lib/options";
import { userName } from "@/lib/user-name";
import { normalizeMoney, optionalText, positiveMoney, requiredValue } from "@/lib/validation";

interface Props {
  household: HouseholdResponse;
  payment?: SuggestedPaymentResponse;
  onClose: () => void;
}

function accountsOf(accounts: readonly AccountResponse[], ownerId: string, currency: Currency) {
  return accounts.filter((account) => account.ownerId === ownerId && account.currency === currency);
}

export function SettlementForm({ household, payment, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const accounts = useAccountsSuspense().data;
  const today = useToday();
  const reportingCurrency = useReportingCurrency();
  const record = useCreateSettlement({ mutation: { ...silentMutation, onSuccess: onClose } });
  const people = [
    ...household.members.map((member) => ({ id: member.userId, name: userName(member) })),
    ...(payment
      ? [
          { id: payment.fromUserId, name: payment.fromName },
          { id: payment.toUserId, name: payment.toName },
        ]
      : []),
  ].filter((person, index, all) => all.findIndex((other) => other.id === person.id) === index);

  function nameOf(id: string) {
    return people.find((person) => person.id === id)?.name ?? "";
  }

  const schema = z
    .object({
      fromUserId: requiredValue(t),
      toUserId: requiredValue(t),
      amount: positiveMoney(t),
      currency: z.enum(Currency),
      date: requiredValue(t),
      note: optionalText(t, createSettlementBodyNoteMax),
      withTransfer: z.boolean(),
      fromAccountId: z.string(),
      toAccountId: z.string(),
    })
    .superRefine((value, ctx) => {
      if (!value.withTransfer) {
        return;
      }
      for (const side of ["fromAccountId", "toAccountId"] as const) {
        if (value[side] === "") {
          ctx.addIssue({ code: "custom", message: t("validation.required"), path: [side] });
        }
      }
    });

  const form = useServerForm({
    defaultValues: {
      fromUserId: payment?.fromUserId ?? "",
      toUserId: payment?.toUserId ?? "",
      amount: payment?.amount ?? "",
      currency: payment?.currency ?? reportingCurrency,
      date: today,
      note: "",
      withTransfer: false,
      fromAccountId: "",
      toAccountId: "",
    },
    schema,
    submit: (value) =>
      record.mutateAsync({
        id: household.id,
        data: {
          fromUserId: value.fromUserId,
          toUserId: value.toUserId,
          amount: normalizeMoney(value.amount),
          currency: value.currency,
          date: value.date,
          note: value.note.trim() || null,
          transfer: value.withTransfer
            ? { fromAccountId: value.fromAccountId, toAccountId: value.toAccountId }
            : null,
        },
      }),
  });

  function clearAccounts() {
    form.setFieldValue("fromAccountId", "");
    form.setFieldValue("toAccountId", "");
  }

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="fromUserId">
          {(field) => (
            <field.SelectFieldControl
              id="settlement-from"
              label={t("households.settlement.from")}
              options={namedOptions(people)}
              onValueChange={clearAccounts}
            />
          )}
        </form.Field>
        <form.Field name="toUserId">
          {(field) => (
            <field.SelectFieldControl
              id="settlement-to"
              label={t("households.settlement.to")}
              options={namedOptions(people)}
              onValueChange={clearAccounts}
            />
          )}
        </form.Field>
        <form.Field name="amount">
          {(field) => (
            <field.MoneyInputField
              id="settlement-amount"
              label={t("households.settlement.amount")}
            />
          )}
        </form.Field>
        <form.Field name="currency">
          {(field) => (
            <field.CurrencyField
              id="settlement-currency"
              label={t("households.settlement.currency")}
              preferred={[reportingCurrency]}
            />
          )}
        </form.Field>
        <form.Field name="date">
          {(field) => (
            <field.DateField id="settlement-date" label={t("households.settlement.date")} />
          )}
        </form.Field>
        <form.Field name="note">
          {(field) => (
            <field.TextField id="settlement-note" label={t("households.settlement.note")} />
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) =>
            [
              state.values.fromUserId,
              state.values.toUserId,
              state.values.currency,
              state.values.withTransfer,
            ] as const
          }
        >
          {([fromUserId, toUserId, currency, withTransfer]) => {
            const sources = accountsOf(accounts, fromUserId, currency);
            const targets = accountsOf(accounts, toUserId, currency);
            const missing = [
              { id: fromUserId, found: sources.length > 0 },
              { id: toUserId, found: targets.length > 0 },
            ].find((side) => side.id !== "" && !side.found);

            return (
              <div className="col-span-full space-y-3">
                <form.Field name="withTransfer">
                  {(field) => (
                    <field.CheckboxField
                      id="settlement-with-transfer"
                      label={t("households.settlement.withTransfer")}
                      hint={t("households.settlement.withTransferHint")}
                    />
                  )}
                </form.Field>
                {withTransfer && missing ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    {t("households.settlement.noAccount", {
                      name: nameOf(missing.id),
                      currency: currency.toUpperCase(),
                    })}
                  </p>
                ) : null}
                {withTransfer && !missing ? (
                  <FormGrid>
                    <form.Field name="fromAccountId">
                      {(field) => (
                        <field.SelectFieldControl
                          id="settlement-from-account"
                          label={t("households.settlement.fromAccount")}
                          options={namedOptions(sources)}
                          placeholder={t("recurringBills.chooseAccount")}
                        />
                      )}
                    </form.Field>
                    <form.Field name="toAccountId">
                      {(field) => (
                        <field.SelectFieldControl
                          id="settlement-to-account"
                          label={t("households.settlement.toAccount")}
                          options={namedOptions(targets)}
                          placeholder={t("recurringBills.chooseAccount")}
                        />
                      )}
                    </form.Field>
                  </FormGrid>
                ) : null}
              </div>
            );
          }}
        </form.Subscribe>

        <FormError error={record.error} />

        <form.FormActions
          span
          pending={record.isPending}
          submitLabel={t("households.settleUp.record")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
