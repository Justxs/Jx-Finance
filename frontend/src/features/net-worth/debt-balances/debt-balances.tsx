import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useDebtBalancesSuspense, useDeleteDebtBalance, useSetDebtBalance } from "@/api/generated";
import type { DebtBalanceEntryResponse, DebtResponse } from "@/api/generated/model";
import { setDebtBalanceBodyNoteMax } from "@/api/schemas/net-worth/net-worth.zod";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { EditModal } from "@/components/modal";
import { RecordRow } from "@/components/record-row/record-row";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionHeader } from "@/components/ui/section/section";
import { childDelete, useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { silentMutation } from "@/lib/mutations";
import { money, normalizeMoney, optionalText, requiredValue } from "@/lib/validation";

interface Props {
  debt: DebtResponse;
}

interface BalanceFormProps extends Props {
  editing?: DebtBalanceEntryResponse;
  onClose: () => void;
}

function BalanceForm({ debt, editing, onClose }: Readonly<BalanceFormProps>) {
  const { t } = useTranslation();
  const today = useToday();
  const mutation = useSetDebtBalance({ mutation: { ...silentMutation, onSuccess: onClose } });

  const schema = z.object({
    amount: money(t),
    date: requiredValue(t).refine((value) => value <= today, t("netWorth.valuations.dateFuture")),
    note: optionalText(t, setDebtBalanceBodyNoteMax),
  });

  const form = useServerForm({
    defaultValues: {
      amount: editing?.amount ?? "",
      date: editing?.date ?? today,
      note: editing?.note ?? "",
    },
    schema,
    submit: (value) =>
      mutation.mutateAsync({
        id: debt.id,
        date: value.date,
        data: { amount: normalizeMoney(value.amount), note: value.note.trim() || null },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="amount">
          {(field) => (
            <field.MoneyInputField
              id="debt-balance-amount"
              label={t("netWorth.debtBalances.amount", { currency: debt.currency.toUpperCase() })}
            />
          )}
        </form.Field>

        <form.Field name="date">
          {(field) => (
            <field.DateField
              id="debt-balance-date"
              label={t("netWorth.valuations.date")}
              disabled={Boolean(editing)}
            />
          )}
        </form.Field>

        <form.Field name="note">
          {(field) => (
            <field.TextField
              id="debt-balance-note"
              label={t("netWorth.valuations.note")}
              placeholder={t("netWorth.debtBalances.notePlaceholder")}
              className="col-span-full"
            />
          )}
        </form.Field>

        <FormError error={mutation.error} />

        <form.FormActions
          span
          pending={mutation.isPending}
          submitLabel={t("actions.save")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}

export function DebtBalances({ debt }: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const formatMoney = useMoney();
  const balances = useDebtBalancesSuspense(debt.id).data;
  const deleteMutation = useDeleteDebtBalance({ mutation: silentMutation });
  const [editDate, setEditDate] = useState<string | null>(null);

  const points = balances.map((balance) => ({ ...balance, id: balance.date }));
  const editing = points.find((point) => point.id === editDate) ?? null;

  function label(point: DebtBalanceEntryResponse) {
    return `${formatMoney.format(Number(point.amount), debt.currency)}, ${formatDate(point.date)}`;
  }

  const remove = useConfirmedDelete(
    childDelete(
      deleteMutation,
      (date) => ({ id: debt.id, date }),
      (variables) => variables.date,
    ),
    points,
    (point) => `${debt.name} · ${label(point)}`,
  );

  return (
    <Section>
      <SectionHeader title={t("netWorth.debtBalances.title")} titleClassName="min-w-0 flex-1">
        <CreateDialog
          label={t("netWorth.debtBalances.add")}
          title={t("netWorth.debtBalances.add")}
          secondary
        >
          {(close) => <BalanceForm debt={debt} onClose={close} />}
        </CreateDialog>
      </SectionHeader>
      <p className="text-xs text-muted-foreground">{t("netWorth.debtBalances.hint")}</p>
      <FormError error={deleteMutation.error} />
      <Rows>
        {points.map((point) => (
          <RecordRow
            key={point.id}
            title={formatDate(point.date)}
            subtitle={point.date === debt.asOf ? t("netWorth.debtBalances.newest") : null}
            note={point.note}
            amount={formatMoney.format(Number(point.amount), debt.currency)}
            label={label(point)}
            onEdit={() => setEditDate(point.id)}
            {...remove.deleteProps(point.id)}
          />
        ))}
      </Rows>
      <EditModal
        item={editing}
        title={t("netWorth.debtBalances.edit")}
        onClose={() => setEditDate(null)}
      >
        {(point, close) => <BalanceForm debt={debt} editing={point} onClose={close} />}
      </EditModal>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </Section>
  );
}
