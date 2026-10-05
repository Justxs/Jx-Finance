import { useTranslation } from "react-i18next";
import type { CategoryResponse, CategorySuggestionResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
import { confidencePercent } from "./confidence";

interface Props {
  suggestion: CategorySuggestionResponse | undefined;
  categories: CategoryResponse[];
  onApply: (categoryId: string) => void;
}

export function CategorySuggestion({ suggestion, categories, onApply }: Readonly<Props>) {
  const { t } = useTranslation();
  const category = categories.find((item) => item.id === suggestion?.categoryId);
  if (!suggestion || !category) {
    return null;
  }

  const source =
    suggestion.source === "rule"
      ? t("transactions.categorySuggestion.byRule", { rule: suggestion.ruleName ?? "" })
      : t("transactions.categorySuggestion.sure", {
          percent: confidencePercent(suggestion.confidence),
        });

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-auto min-h-8 max-w-full"
        onClick={() => onApply(category.id)}
      >
        <span className="min-w-0 py-1 text-left wrap-break-word whitespace-normal">
          {t("transactions.categorySuggestion.label", { category: category.name })}
        </span>
      </Button>
      <span>{source}</span>
    </div>
  );
}
