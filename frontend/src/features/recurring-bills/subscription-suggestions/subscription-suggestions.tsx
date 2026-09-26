import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDismissSubscriptionCandidate } from "@/api/generated";
import type {
  AccountResponse,
  CategoryResponse,
  SubscriptionCandidateResponse,
} from "@/api/generated/model";
import { ListSection } from "@/components/list-section/list-section";
import { EditModal } from "@/components/modal";
import { silent } from "@/lib/mutations";
import { RecurringBillForm } from "../recurring-bill-form/recurring-bill-form";
import { SubscriptionSuggestionRow, suggestedName } from "./subscription-suggestion-row";

function candidateKey(accountId: string, description: string) {
  return `${accountId}:${description}`;
}

interface Selected {
  id: string;
  candidate: SubscriptionCandidateResponse;
}

interface Props {
  candidates: SubscriptionCandidateResponse[];
  accounts: AccountResponse[];
  categories: CategoryResponse[];
}

export function SubscriptionSuggestions({ candidates, accounts, categories }: Readonly<Props>) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState<Selected | null>(null);

  const dismiss = useDismissSubscriptionCandidate(
    silent({ meta: { success: t("subscriptions.dismissed") } }),
  );

  const pending = dismiss.isPending ? dismiss.variables?.data : undefined;
  const pendingKey = pending ? candidateKey(pending.accountId, pending.description) : null;

  return (
    <>
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
              onCreate={() => setCreating({ id: key, candidate })}
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
      <EditModal
        item={creating}
        onClose={() => setCreating(null)}
        title={t("subscriptions.createTitle")}
        description={() => t("subscriptions.createDescription")}
      >
        {({ candidate }, close) => (
          <RecurringBillForm
            draft={{
              name: suggestedName(candidate.description),
              shape: "expense",
              kind: "fixed",
              amount: candidate.typicalAmount,
              categoryId: candidate.categoryId,
              accountId: candidate.accountId,
              cadence: candidate.cadence,
              nextDueDate: candidate.nextExpectedDate,
            }}
            accounts={accounts}
            categories={categories}
            onClose={close}
          />
        )}
      </EditModal>
    </>
  );
}
