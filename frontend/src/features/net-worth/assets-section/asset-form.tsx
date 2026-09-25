import { useTranslation } from "react-i18next";
import { useCreateAsset, useUpdateAsset } from "@/api/generated";
import { AssetType } from "@/api/generated/model";
import { silent, upsert } from "@/lib/mutations";
import { HoldingForm, type HoldingFormProps } from "../holdings-section";

const assetTypes = Object.values(AssetType);

export function AssetForm({ editing, onClose }: Readonly<HoldingFormProps>) {
  const { t } = useTranslation();
  const { create, update, pending, error } = upsert(
    useCreateAsset(silent({ onSuccess: onClose })),
    useUpdateAsset(silent({ onSuccess: onClose })),
  );

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
      pending={pending}
      error={error}
      errorAliases={{ currentValue: "amount" }}
      onSubmit={(values) => {
        const data = {
          name: values.name,
          type: assetTypes.find((type) => type === values.type) ?? AssetType.other,
          currentValue: values.amount,
          asOf: values.asOf,
        };

        if (editing) {
          return update({ id: editing.id, data });
        }

        return create({ data });
      }}
      onCancel={onClose}
    />
  );
}
