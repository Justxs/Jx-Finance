import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDismissSuggestedRule } from "@/api/generated";
import type {
  AccountResponse,
  CategoryResponse,
  SuggestedRuleResponse,
  TagResponse,
} from "@/api/generated/model";
import { ListSection } from "@/components/list-section/list-section";
import { EditModal } from "@/components/modal";
import { Button } from "@/components/ui/button/button";
import { Tag } from "@/components/ui/tag/tag";
import { RuleForm } from "@/features/categorization-rules/rule-form/rule-form";
import { conditionText } from "@/features/categorization-rules/rule-form/rule-summary";
import { silentMutation } from "@/lib/mutations";
import { nameById } from "@/lib/options";
import { ruleFromSuggestion } from "@/lib/suggested-rule";

function suggestionKey(suggestion: { key: string; categoryId: string }) {
  return `${suggestion.categoryId}:${suggestion.key}`;
}

interface Reviewing {
  id: string;
  suggestion: SuggestedRuleResponse;
}

interface Props {
  suggestions: SuggestedRuleResponse[];
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
}

export function SuggestedRules({ suggestions, accounts, categories, tags }: Readonly<Props>) {
  const { t } = useTranslation();
  const [reviewing, setReviewing] = useState<Reviewing | null>(null);
  const dismiss = useDismissSuggestedRule({ mutation: silentMutation });
  const categoryNames = nameById(categories);

  const pending = dismiss.isPending ? dismiss.variables?.data : undefined;
  const pendingKey = pending ? suggestionKey(pending) : null;

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <>
      <ListSection
        title={t("categorizationRules.suggested.title")}
        count={suggestions.length}
        description={t("categorizationRules.suggested.description")}
        emptyText=""
      >
        {suggestions.map((suggestion) => {
          const key = suggestionKey(suggestion);
          const categoryName = categoryNames.get(suggestion.categoryId);
          return (
            <li key={key} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="min-w-0 text-sm font-medium wrap-break-word">{suggestion.name}</p>
                <p className="min-w-0 text-xs wrap-break-word text-muted-foreground">
                  {conditionText(t, suggestion.match, suggestion.pattern, undefined, null, null)}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  {categoryName ? <Tag tone="accent">{categoryName}</Tag> : null}
                  <span>
                    {t("categorizationRules.suggested.evidence", { count: suggestion.evidence })}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewing({ id: key, suggestion })}
                >
                  {t("categorizationRules.suggested.review")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  pending={pendingKey === key}
                  disabled={dismiss.isPending}
                  onClick={() =>
                    dismiss.mutate({
                      data: { key: suggestion.key, categoryId: suggestion.categoryId },
                    })
                  }
                  aria-label={`${t("categorizationRules.suggested.dismiss")}: ${suggestion.name}`}
                >
                  <X />
                </Button>
              </div>
            </li>
          );
        })}
      </ListSection>
      <EditModal
        item={reviewing}
        title={t("categorizationRules.suggested.reviewTitle")}
        className="sm:max-w-2xl"
        onClose={() => setReviewing(null)}
      >
        {({ suggestion }, close) => (
          <RuleForm
            accounts={accounts}
            categories={categories}
            tags={tags}
            draft={ruleFromSuggestion(suggestion)}
            onClose={close}
          />
        )}
      </EditModal>
    </>
  );
}
