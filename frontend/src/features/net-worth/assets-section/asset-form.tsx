import { useTranslation } from "react-i18next";
import { useCreateAssetEndpoint, useUpdateAssetEndpoint } from "@/api/generated";
import { AssetType } from "@/api/generated/model";
import { HoldingForm, type HoldingFormProps } from "../holdings-section";

const assetTypes = Object.values(AssetType);

export function AssetForm({ editing, onCreated, onCancel }: Readonly<HoldingFormProps>) {
  const { t } = useTranslation();
  const createMutation = useCreateAssetEndpoint({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });
  const updateMutation = useUpdateAssetEndpoint({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });

  return (
    <HoldingForm
      idPrefix={editing ? "asset-edit" : "asset"}
      typeOptions={assetTypes.map((type) => ({
        value: type,
        label: t(`netWorth.assetTypes.${type}`),
      }))}
      defaultType={AssetType.other}
      initialValues={editing?.values}
      amountLabel={t("netWorth.currentValue")}
      withAsOf
      pending={createMutation.isPending || updateMutation.isPending}
      error={createMutation.error ?? updateMutation.error}
      onSubmit={(values) => {
        const data = {
          name: values.name,
          type: assetTypes.find((type) => type === values.type) ?? AssetType.other,
          currentValue: values.amount,
          asOf: values.asOf,
        };

        if (editing) {
          updateMutation.mutate({ id: editing.id, data });
          return;
        }

        createMutation.mutate({ data });
      }}
      onCancel={onCancel}
    />
  );
}
