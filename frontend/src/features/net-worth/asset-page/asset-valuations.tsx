import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  useAssetValuationsSuspense,
  useDeleteAssetValuation,
  useSetAssetValuation,
} from "@/api/generated";
import type { AssetResponse, AssetValuationResponse } from "@/api/generated/model";
import { setAssetValuationBodyNoteMax } from "@/api/schemas/net-worth/net-worth.zod";
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
  asset: AssetResponse;
}

interface ValuationFormProps extends Props {
  editing?: AssetValuationResponse;
  onClose: () => void;
}

function ValuationForm({ asset, editing, onClose }: Readonly<ValuationFormProps>) {
  const { t } = useTranslation();
  const today = useToday();
  const mutation = useSetAssetValuation({ mutation: { ...silentMutation, onSuccess: onClose } });

  const schema = z.object({
    value: money(t),
    date: requiredValue(t).refine((value) => value <= today, t("netWorth.valuations.dateFuture")),
    note: optionalText(t, setAssetValuationBodyNoteMax),
  });

  const form = useServerForm({
    defaultValues: {
      value: editing?.value ?? "",
      date: editing?.date ?? today,
      note: editing?.note ?? "",
    },
    schema,
    submit: (value) =>
      mutation.mutateAsync({
        id: asset.id,
        date: value.date,
        data: { value: normalizeMoney(value.value), note: value.note.trim() || null },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="value">
          {(field) => (
            <field.MoneyInputField
              id="valuation-value"
              label={t("netWorth.valuations.value", { currency: asset.currency.toUpperCase() })}
            />
          )}
        </form.Field>

        <form.Field name="date">
          {(field) => (
            <field.DateField
              id="valuation-date"
              label={t("netWorth.valuations.date")}
              disabled={Boolean(editing)}
            />
          )}
        </form.Field>

        <form.Field name="note">
          {(field) => (
            <field.TextField
              id="valuation-note"
              label={t("netWorth.valuations.note")}
              placeholder={t("netWorth.valuations.notePlaceholder")}
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

export function AssetValuations({ asset }: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const formatMoney = useMoney();
  const valuations = useAssetValuationsSuspense(asset.id).data;
  const deleteMutation = useDeleteAssetValuation({ mutation: silentMutation });
  const [editDate, setEditDate] = useState<string | null>(null);

  const points = valuations.map((valuation) => ({ ...valuation, id: valuation.date }));
  const editing = points.find((point) => point.id === editDate) ?? null;

  function label(point: AssetValuationResponse) {
    return `${formatMoney.format(Number(point.value), asset.currency)}, ${formatDate(point.date)}`;
  }

  const remove = useConfirmedDelete(
    childDelete(
      deleteMutation,
      (date) => ({ id: asset.id, date }),
      (variables) => variables.date,
    ),
    points,
    (point) => `${asset.name} · ${label(point)}`,
  );

  return (
    <Section>
      <SectionHeader title={t("netWorth.valuations.title")} titleClassName="min-w-0 flex-1">
        <CreateDialog
          label={t("netWorth.valuations.add")}
          title={t("netWorth.valuations.add")}
          secondary
        >
          {(close) => <ValuationForm asset={asset} onClose={close} />}
        </CreateDialog>
      </SectionHeader>
      <p className="text-xs text-muted-foreground">{t("netWorth.valuations.hint")}</p>
      <FormError error={deleteMutation.error} />
      <Rows>
        {points.map((point) => (
          <RecordRow
            key={point.id}
            title={formatDate(point.date)}
            subtitle={point.date === asset.asOf ? t("netWorth.valuations.newest") : null}
            note={point.note}
            amount={formatMoney.format(Number(point.value), asset.currency)}
            label={label(point)}
            onEdit={() => setEditDate(point.id)}
            {...remove.deleteProps(point.id)}
          />
        ))}
      </Rows>
      <EditModal
        item={editing}
        title={t("netWorth.valuations.edit")}
        onClose={() => setEditDate(null)}
      >
        {(point, close) => <ValuationForm asset={asset} editing={point} onClose={close} />}
      </EditModal>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </Section>
  );
}
