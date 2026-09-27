import { useTranslation } from "react-i18next";
import type { SyntheticCategoryGroup } from "@/api/generated/model";

interface NamedCategory {
  categoryId: string | null;
  categoryName: string;
  syntheticGroup?: SyntheticCategoryGroup | null;
}

export function useCategoryName() {
  const { t } = useTranslation();

  return function categoryName(item: NamedCategory) {
    if (item.syntheticGroup) {
      return t(`reports.syntheticGroups.${item.syntheticGroup}`);
    }
    return item.categoryId ? item.categoryName : t("transactions.uncategorized");
  };
}
