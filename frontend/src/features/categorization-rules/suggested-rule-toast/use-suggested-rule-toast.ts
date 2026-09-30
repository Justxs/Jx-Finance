import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getSuggestedRulesSuspenseQueryOptions,
  useCreateCategorizationRule,
  useDismissSuggestedRule,
} from "@/api/generated";
import type { CategoryResponse } from "@/api/generated/model";
import { ruleFromSuggestion } from "@/features/categorization-rules/rule-form/rule-summary";
import { useFeature } from "@/hooks/use-settings";
import { notify } from "@/lib/mutations";
import { nameById } from "@/lib/options";
import { silentQuery } from "@/lib/query-client";

const QUESTION_DURATION = 12_000;

export function useSuggestedRuleToast(categories: readonly CategoryResponse[]) {
  const { t } = useTranslation();
  const enabled = useFeature("categorizationRules");
  const queryClient = useQueryClient();
  const create = useCreateCategorizationRule({
    mutation: notify(t("categorizationRules.suggested.created")),
  });
  const dismiss = useDismissSuggestedRule();
  const categoryNames = nameById(categories);

  async function offerAfterSave(transactionId: string) {
    if (!enabled) {
      return;
    }
    const [suggestion] = await queryClient
      .query({
        ...getSuggestedRulesSuspenseQueryOptions({ transactionId }),
        ...silentQuery,
      })
      .catch(() => []);
    if (!suggestion) {
      return;
    }
    toast(
      t(`categorizationRules.suggested.question.${suggestion.match}`, {
        pattern: suggestion.pattern,
        category: categoryNames.get(suggestion.categoryId) ?? "",
      }),
      {
        duration: QUESTION_DURATION,
        action: {
          label: t("categorizationRules.suggested.create"),
          onClick: () => create.mutate({ data: ruleFromSuggestion(suggestion) }),
        },
        cancel: {
          label: t("categorizationRules.suggested.dontAsk"),
          onClick: () =>
            dismiss.mutate({
              data: { key: suggestion.key, categoryId: suggestion.categoryId },
            }),
        },
      },
    );
  }

  return { offerAfterSave };
}
