import { useTranslation } from "react-i18next";
import { useCreateDebt, useUpdateDebt } from "@/api/generated";
import { DebtType } from "@/api/generated/model";
import { normalizeMoney } from "@/lib/validation";
import { HoldingForm, type HoldingFormProps } from "../holdings-section";

const debtTypes = Object.values(DebtType);

export function DebtForm({ editing, onCreated, onCancel }: Readonly<HoldingFormProps>) {
  const { t } = useTranslation();
  const createMutation = useCreateDebt({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });
  const updateMutation = useUpdateDebt({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });

  return (
    <HoldingForm
      idPrefix={editing ? "debt-edit" : "debt"}
      typeOptions={debtTypes.map((type) => ({
        value: type,
        label: t(`netWorth.debtTypes.${type}`),
      }))}
      defaultType={DebtType.other}
      initialValues={editing?.values}
      amountLabel={t("netWorth.outstandingAmount")}
      withInterestRate
      pending={createMutation.isPending || updateMutation.isPending}
      error={createMutation.error ?? updateMutation.error}
      errorAliases={{ outstandingAmount: "amount" }}
      onSubmit={(values) => {
        const rate = normalizeMoney(values.interestRate);
        const data = {
          name: values.name,
          type: debtTypes.find((type) => type === values.type) ?? DebtType.other,
          outstandingAmount: values.amount,
          interestRate: rate ? Number(rate) : null,
          asOf: values.asOf,
        };

        if (editing) {
          return updateMutation.mutateAsync({ id: editing.id, data });
        }

        return createMutation.mutateAsync({ data });
      }}
      onCancel={onCancel}
    />
  );
}
