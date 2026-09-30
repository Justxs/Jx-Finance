import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useLinkDebtPayment, useUpdateDebtPayment } from "@/api/generated";
import {
  DebtPaymentKind,
  type DebtPaymentResponse,
  type DebtResponse,
} from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { silentMutation } from "@/lib/mutations";
import { namedOptions, optionsOf } from "@/lib/options";
import { normalizeMoney, optionalPositiveMoney } from "@/lib/validation";

const kinds = Object.values(DebtPaymentKind);

interface PaymentFormProps {
  debts: DebtResponse[];
  transactionId?: string;
  payment?: DebtPaymentResponse;
  onClose: () => void;
}

export function DebtPaymentForm({
  debts,
  transactionId,
  payment,
  onClose,
}: Readonly<PaymentFormProps>) {
  const { t } = useTranslation();
  const link = useLinkDebtPayment({ mutation: { ...silentMutation, onSuccess: onClose } });
  const update = useUpdateDebtPayment({ mutation: { ...silentMutation, onSuccess: onClose } });
  const kindOptions = optionsOf(kinds, (kind) => t(`netWorth.payments.kinds.${kind}`));

  const defaultKind: DebtPaymentKind | "" = payment?.kind ?? "";

  const form = useServerForm({
    defaultValues: {
      debtId: debts[0]?.id ?? "",
      kind: defaultKind,
      principal: payment?.principalTyped ? payment.principal : "",
    },
    schema: z.object({
      debtId: z.string(),
      kind: z.enum(DebtPaymentKind).or(z.literal("")),
      principal: optionalPositiveMoney(t),
    }),
    submit: (value) => {
      const principal = normalizeMoney(value.principal) || null;
      return payment
        ? update.mutateAsync({
            id: value.debtId,
            paymentId: payment.id,
            data: { kind: value.kind || payment.kind, principal },
          })
        : link.mutateAsync({
            id: value.debtId,
            data: { transactionId: transactionId ?? "", kind: value.kind || null, principal },
          });
    },
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        {payment ? null : (
          <form.Field name="debtId">
            {(field) => (
              <field.SelectFieldControl
                id="debt-payment-debt"
                label={t("netWorth.payments.debt")}
                options={namedOptions(debts)}
              />
            )}
          </form.Field>
        )}

        <form.Field name="kind">
          {(field) => (
            <field.SelectFieldControl
              id="debt-payment-kind"
              label={t("netWorth.payments.kind")}
              options={
                payment
                  ? kindOptions
                  : [{ value: "", label: t("netWorth.payments.kinds.auto") }, ...kindOptions]
              }
            />
          )}
        </form.Field>

        <form.Field name="principal">
          {(field) => (
            <field.MoneyInputField
              id="debt-payment-principal"
              label={t("netWorth.payments.principal")}
              hint={t("netWorth.payments.principalHint")}
            />
          )}
        </form.Field>

        <FormError error={payment ? update.error : link.error} />

        <form.FormActions
          span
          pending={link.isPending || update.isPending}
          submitLabel={t("actions.save")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
