import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useDismissSubscriptionCandidate } from "@/api/generated";
import type {
  AccountResponse,
  CategoryResponse,
  SubscriptionCandidateResponse,
} from "@/api/generated/model";
import { ListSection } from "@/components/list-section/list-section";
import { silent } from "@/lib/mutations";
import { SubscriptionSuggestionRow } from "./subscription-suggestion-row";

function candidateKey(accountId: string, description: string) {
  return `${accountId}:${description}`;
}

interface Props {
  candidates: SubscriptionCandidateResponse[];
  accounts: AccountResponse[];
  categories: CategoryResponse[];
}

export function SubscriptionSuggestions({ candidates, accounts, categories }: Readonly<Props>) {
  const { t } = useTranslation();

  const dismiss = useDismissSubscriptionCandidate(
    silent({ onSuccess: () => toast.success(t("subscriptions.dismissed")) }),
  );

  const pending = dismiss.isPending ? dismiss.variables?.data : undefined;
  const pendingKey = pending ? candidateKey(pending.accountId, pending.description) : null;

  return (
    <ListSection
      title={t("subscriptions.title")}
      count={candidates.length}
      description={t("subscriptions.explainer")}
      emptyText={t("subscriptions.empty")}
    >
      {candidates.map((candidate) => {
        const key = candidateKey(candidate.accountId, candidate.description);
        return (
          <SubscriptionSuggestionRow
            key={key}
            candidate={candidate}
            accounts={accounts}
            categories={categories}
            onDismiss={() =>
              dismiss.mutate({
                data: {
                  accountId: candidate.accountId,
                  description: candidate.description,
                },
              })
            }
            dismissPending={pendingKey === key}
            dismissDisabled={dismiss.isPending}
          />
        );
      })}
    </ListSection>
  );
}
