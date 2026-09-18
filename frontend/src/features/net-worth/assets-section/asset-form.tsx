import { useTranslation } from "react-i18next";
import { useCreateAssetEndpoint } from "@/api/generated";
import { AssetType } from "@/api/generated/model";
import { HoldingForm, type HoldingFormProps } from "../holdings-section";

const assetTypes = Object.values(AssetType);

export function AssetForm({ onCreated, onCancel }: Readonly<HoldingFormProps>) {
  const { t } = useTranslation();
  const createMutation = useCreateAssetEndpoint({ mutation: { onSuccess: onCreated } });

  return (
    <HoldingForm
      idPrefix="asset"
      typeOptions={assetTypes.map((type) => ({
        value: type,
        label: t(`netWorth.assetTypes.${type}`),
      }))}
      defaultType={AssetType.other}
      amountLabel={t("netWorth.currentValue")}
      withAsOf
      pending={createMutation.isPending}
      onSubmit={(values) => {
        createMutation.mutate({
          data: {
            name: values.name,
            type: assetTypes.find((type) => type === values.type) ?? AssetType.other,
            currentValue: values.amount,
            asOf: values.asOf,
          },
        });
      }}
      onCancel={onCancel}
    />
  );
}
