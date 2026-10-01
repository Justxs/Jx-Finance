import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateContactPayment } from "@/api/generated";
import {
  ContactPaymentDirection,
  Currency,
  type ContactBalanceResponse,
  type ContactResponse,
} from "@/api/generated/model";
import { createContactPaymentBodyNoteMax } from "@/api/schemas/contacts/contacts.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useReportingCurrency } from "@/hooks/use-currencies";
import { useToday } from "@/hooks/use-settings";
import { silentMutation } from "@/lib/mutations";
import { optionsOf } from "@/lib/options";
import { normalizeMoney, optionalText, positiveMoney, requiredValue } from "@/lib/validation";

interface Props {
  contact: ContactResponse;
  onClose: () => void;
}

function settling(balance: ContactBalanceResponse | undefined) {
  if (!balance) {
    return { direction: ContactPaymentDirection.toContact, amount: "" };
  }
  const owed = Number(balance.amount) > 0;
  return {
    direction: owed ? ContactPaymentDirection.fromContact : ContactPaymentDirection.toContact,
    amount: Math.abs(Number(balance.amount)).toFixed(2),
  };
}

export function ContactPaymentForm({ contact, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const reportingCurrency = useReportingCurrency();
  const record = useCreateContactPayment({ mutation: { ...silentMutation, onSuccess: onClose } });
  const balance = contact.balances[0];
  const suggested = settling(balance);

  const schema = z.object({
    direction: z.enum(ContactPaymentDirection),
    amount: positiveMoney(t),
    currency: z.enum(Currency),
    date: requiredValue(t),
    note: optionalText(t, createContactPaymentBodyNoteMax),
  });

  const form = useServerForm({
    defaultValues: {
      direction: suggested.direction,
      amount: suggested.amount,
      currency: balance?.currency ?? reportingCurrency,
      date: today,
      note: "",
    },
    schema,
    submit: (value) =>
      record.mutateAsync({
        id: contact.id,
        data: {
          direction: value.direction,
          amount: normalizeMoney(value.amount),
          currency: value.currency,
          date: value.date,
          note: value.note.trim() || null,
        },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="direction">
          {(field) => (
            <field.SelectFieldControl
              id="contact-payment-direction"
              kind="segments"
              label={t("households.people.payment.direction")}
              hint={t("households.people.payment.hint")}
              className="col-span-full"
              options={optionsOf(Object.values(ContactPaymentDirection), (direction) =>
                direction === ContactPaymentDirection.toContact
                  ? t("households.people.youPaid", { name: contact.name })
                  : t("households.people.theyPaid", { name: contact.name }),
              )}
            />
          )}
        </form.Field>
        <form.Field name="amount">
          {(field) => (
            <field.MoneyInputField
              id="contact-payment-amount"
              label={t("households.settlement.amount")}
            />
          )}
        </form.Field>
        <form.Field name="currency">
          {(field) => (
            <field.CurrencyField
              id="contact-payment-currency"
              label={t("households.settlement.currency")}
              preferred={[reportingCurrency]}
            />
          )}
        </form.Field>
        <form.Field name="date">
          {(field) => (
            <field.DateField id="contact-payment-date" label={t("households.settlement.date")} />
          )}
        </form.Field>
        <form.Field name="note">
          {(field) => (
            <field.TextField id="contact-payment-note" label={t("households.settlement.note")} />
          )}
        </form.Field>

        <FormError error={record.error} />

        <form.FormActions
          span
          pending={record.isPending}
          submitLabel={t("households.people.record")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
