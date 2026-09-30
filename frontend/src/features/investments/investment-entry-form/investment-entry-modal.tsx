import { useTranslation } from "react-i18next";
import type { AccountResponse, InvestmentTransactionResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { FormGridSkeleton } from "@/components/ui/form-grid/form-grid";
import { useRetained } from "@/hooks/use-retained";
import { InvestmentEntryForm } from "./investment-entry-form";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: readonly AccountResponse[];
  accountId?: string;
  editing?: InvestmentTransactionResponse;
}

export function InvestmentEntryModal({
  open,
  onOpenChange,
  accounts,
  accountId,
  editing,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const shown = useRetained(editing, !open);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={shown ? t("investments.entry.editTitle") : t("investments.entry.title")}
      description={shown ? undefined : t("investments.entry.description")}
    >
      <QueryBoundary fallback={<FormGridSkeleton fields={8} actions={2} />}>
        <InvestmentEntryForm
          key={shown?.id ?? "new"}
          accounts={accounts}
          accountId={accountId}
          editing={shown}
          onClose={() => onOpenChange(false)}
        />
      </QueryBoundary>
    </Modal>
  );
}
