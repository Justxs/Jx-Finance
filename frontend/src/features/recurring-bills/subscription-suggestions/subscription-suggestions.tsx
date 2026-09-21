import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useDismissSubscriptionCandidate } from "@/api/generated";
import type {
  AccountResponse,
  CategoryResponse,
  SubscriptionCandidateResponse,
} from "@/api/generated/model";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionTitle } from "@/components/ui/section/section";
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
    <Section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <SectionTitle>{t("subscriptions.title")}</SectionTitle>
        <span className="text-sm text-muted-foreground tabular-nums">{candidates.length}</span>
      </div>
      <p className="mb-3 max-w-prose text-sm text-muted-foreground">
        {t("subscriptions.explainer")}
      </p>
      {candidates.length === 0 ? (
        <EmptyText>{t("subscriptions.empty")}</EmptyText>
      ) : (
        <Rows>
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
        </Rows>
      )}
    </Section>
  );
}
