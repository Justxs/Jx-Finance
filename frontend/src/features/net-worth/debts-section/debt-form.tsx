import { useTranslation } from "react-i18next";
import { useCreateDebtEndpoint } from "@/api/generated";
import { DebtType } from "@/api/generated/model";
import { normalizeMoney } from "@/lib/validation";
import { HoldingForm, type HoldingFormProps } from "../holdings-section";

const debtTypes = Object.values(DebtType);

export function DebtForm({ onCreated, onCancel }: Readonly<HoldingFormProps>) {
  const { t } = useTranslation();
  const createMutation = useCreateDebtEndpoint({ mutation: { onSuccess: onCreated } });

  return (
    <HoldingForm
      idPrefix="debt"
      typeOptions={debtTypes.map((type) => ({
        value: type,
        label: t(`netWorth.debtTypes.${type}`),
      }))}
      defaultType={DebtType.other}
      amountLabel={t("netWorth.outstandingAmount")}
      withInterestRate
      pending={createMutation.isPending}
      onSubmit={(values) => {
        const rate = normalizeMoney(values.interestRate);
        createMutation.mutate({
          data: {
            name: values.name,
            type: debtTypes.find((type) => type === values.type) ?? DebtType.other,
            outstandingAmount: values.amount,
            interestRate: rate ? Number(rate) : null,
            asOf: values.asOf,
          },
        });
      }}
      onCancel={onCancel}
    />
  );
}
