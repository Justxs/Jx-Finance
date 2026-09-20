import { useTranslation } from "react-i18next";
import { useCreateDebt, useUpdateDebt } from "@/api/generated";
import { DebtType } from "@/api/generated/model";
import { silent, upsert } from "@/lib/mutations";
import { normalizeMoney } from "@/lib/validation";
import { HoldingForm, type HoldingFormProps } from "../holdings-section";

const debtTypes = Object.values(DebtType);

export function DebtForm({ editing, onCreated, onCancel }: Readonly<HoldingFormProps>) {
  const { t } = useTranslation();
  const { create, update, pending, error } = upsert(
    useCreateDebt(silent({ onSuccess: onCreated })),
    useUpdateDebt(silent({ onSuccess: onCreated })),
  );

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
      pending={pending}
      error={error}
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
          return update({ id: editing.id, data });
        }

        return create({ data });
      }}
      onCancel={onCancel}
    />
  );
}
