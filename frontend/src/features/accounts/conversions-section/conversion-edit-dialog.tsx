import { useTranslation } from "react-i18next";
import { useUpdateConversion } from "@/api/generated";
import type { AccountResponse, CategoryResponse, ConversionResponse } from "@/api/generated/model";
import { EditModal } from "@/components/modal";
import { silent } from "@/lib/mutations";
import { ConversionForm } from "./conversion-form";

interface FormProps {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  conversion: ConversionResponse;
  onClose: () => void;
}

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  conversion: ConversionResponse | null;
  onClose: () => void;
}

function ConversionEditForm({ accounts, categories, conversion, onClose }: Readonly<FormProps>) {
  const updateMutation = useUpdateConversion(silent({ onSuccess: onClose }));

  return (
    <ConversionForm
      accounts={accounts}
      categories={categories}
      conversion={conversion}
      error={updateMutation.error}
      pending={updateMutation.isPending}
      onSubmit={({ accountId: _accountId, ...data }) =>
        updateMutation.mutateAsync({ id: conversion.id, data })
      }
      onCancel={onClose}
    />
  );
}

export function ConversionEditDialog({
  accounts,
  categories,
  conversion,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <EditModal item={conversion} title={t("conversions.editTitle")} onClose={onClose}>
      {(shown) => (
        <ConversionEditForm
          accounts={accounts}
          categories={categories}
          conversion={shown}
          onClose={onClose}
        />
      )}
    </EditModal>
  );
}
