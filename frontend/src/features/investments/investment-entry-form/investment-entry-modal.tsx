import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useCreateInvestmentTransaction,
  useSecuritiesSuspense,
  useUpdateInvestmentTransaction,
} from "@/api/generated";
import type { AccountResponse, InvestmentTransactionResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { silent, upsert } from "@/lib/mutations";
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

  function closeWith(message: string) {
    toast.success(message);
    onOpenChange(false);
  }

  const { create, update, pending, error } = upsert(
    useCreateInvestmentTransaction(
      silent({ onSuccess: () => closeWith(t("investments.entry.saved")) }),
    ),
    useUpdateInvestmentTransaction(
      silent({ onSuccess: () => closeWith(t("investments.entry.corrected")) }),
    ),
  );

  return (
    <InvestmentEntryForm
      key={editing?.id ?? "new"}
      accounts={accounts}
      securities={securities.data ?? []}
      accountId={accountId}
      editing={editing}
      pending={pending}
      serverError={error}
      onSubmit={(values) => {
        if (editing) {
          return update({ id: editing.id, data: values });
        }

        return create({ data: values });
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
