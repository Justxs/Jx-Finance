import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateConversion } from "@/api/generated";
import type { AccountResponse, CategoryResponse, ConversionResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
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
  const updateMutation = useUpdateConversion({
    mutation: { meta: { silent: true }, onSuccess: onClose },
  });

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
  const [shown, setShown] = useState(conversion);

  if (conversion !== null && conversion !== shown) {
    setShown(conversion);
  }

  return (
    <Modal
      open={conversion !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={t("conversions.editTitle")}
    >
      {shown ? (
        <ConversionEditForm
          key={shown.id}
          accounts={accounts}
          categories={categories}
          conversion={shown}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}
