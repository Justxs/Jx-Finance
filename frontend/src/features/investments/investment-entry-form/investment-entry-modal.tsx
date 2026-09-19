import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useCreateInvestmentTransactionEndpoint,
  useGetSecuritiesEndpointSuspense,
} from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvalidateInvestments } from "../use-invalidate-investments";
import { InvestmentEntryForm } from "./investment-entry-form";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: readonly AccountResponse[];
  accountId?: string;
}

type ContentProps = Omit<Props, "open">;

function EntryModalContent({ onOpenChange, accounts, accountId }: Readonly<ContentProps>) {
  const { t } = useTranslation();
  const { invalidateEntries } = useInvalidateInvestments();
  const securities = useGetSecuritiesEndpointSuspense();

  const createMutation = useCreateInvestmentTransactionEndpoint({
    mutation: {
      onSuccess: () => {
        toast.success(t("investments.entry.saved"));
        onOpenChange(false);
      },
      onSettled: invalidateEntries,
    },
  });

  return (
    <InvestmentEntryForm
      accounts={accounts}
      securities={securities.data ?? []}
      accountId={accountId}
      pending={createMutation.isPending}
      onSubmit={(values) => createMutation.mutate({ data: values })}
      onCancel={() => onOpenChange(false)}
    />
  );
}

export function InvestmentEntryModal({ open, onOpenChange, accounts, accountId }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("investments.entry.title")}
      description={t("investments.entry.description")}
    >
      {open ? (
        <QueryBoundary fallback={<Skeleton className="h-72 w-full" />}>
          <EntryModalContent
            onOpenChange={onOpenChange}
            accounts={accounts}
            accountId={accountId}
          />
        </QueryBoundary>
      ) : null}
    </Modal>
  );
}
