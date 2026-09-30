import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import type { Scope } from "@/api/generated/model";
import { Tag } from "@/components/ui/tag/tag";

interface Props {
  scope: Scope;
  householdId: string | null;
  className?: string;
}

export function SharedScopeTag({ scope, householdId, className }: Readonly<Props>) {
  const { t } = useTranslation();
  const households = useHouseholdsSuspense().data;

  if (scope !== "shared") {
    return null;
  }

  const household = households.find((item) => item.id === householdId);

  return (
    <Tag tone="accent" className={className}>
      {t("sharing.sharedWith", { household: household?.name ?? "" })}
    </Tag>
  );
}
