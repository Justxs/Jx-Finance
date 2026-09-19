import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useCreateInvestmentTransaction,
  useSecuritiesSuspense,
  useUpdateInvestmentTransaction,
} from "@/api/generated";
import type { AccountResponse, InvestmentTransactionResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestmentEntryForm } from "./investment-entry-form";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: readonly AccountResponse[];
  accountId?: string;
  editing?: InvestmentTransactionResponse;
}

type ContentProps = Omit<Props, "open">;

function EntryModalContent({ onOpenChange, accounts, accountId, editing }: Readonly<ContentProps>) {
  const { t } = useTranslation();
  const securities = useSecuritiesSuspense();

  const createMutation = useCreateInvestmentTransaction({
    mutation: {
      meta: { silent: true },
      onSuccess: () => {
        toast.success(t("investments.entry.saved"));
        onOpenChange(false);
      },
    },
  });

  const updateMutation = useUpdateInvestmentTransaction({
    mutation: {
      meta: { silent: true },
      onSuccess: () => {
        toast.success(t("investments.entry.corrected"));
        onOpenChange(false);
      },
    },
  });

  return (
    <InvestmentEntryForm
      key={editing?.id ?? "new"}
      accounts={accounts}
      securities={securities.data ?? []}
      accountId={accountId}
      editing={editing}
      pending={createMutation.isPending || updateMutation.isPending}
      serverError={createMutation.error ?? updateMutation.error}
      onSubmit={(values) => {
        if (editing) {
          return updateMutation.mutateAsync({ id: editing.id, data: values });
        }

        return createMutation.mutateAsync({ data: values });
      }}
      onCancel={() => onOpenChange(false)}
    />
  );
}

export function InvestmentEntryModal({
  open,
  onOpenChange,
  accounts,
  accountId,
  editing,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? t("investments.entry.editTitle") : t("investments.entry.title")}
      description={editing ? undefined : t("investments.entry.description")}
    >
      {open ? (
        <QueryBoundary fallback={<Skeleton className="h-72 w-full" />}>
          <EntryModalContent
            onOpenChange={onOpenChange}
            accounts={accounts}
            accountId={accountId}
            editing={editing}
          />
        </QueryBoundary>
      ) : null}
    </Modal>
  );
}
