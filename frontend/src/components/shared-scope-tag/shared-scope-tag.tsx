import { useTranslation } from "react-i18next";
import type { Scope } from "@/api/generated/model";
import { Tag } from "@/components/ui/tag/tag";

interface Props {
  scope: Scope;
  householdName: string | undefined;
  className?: string;
}

export function SharedScopeTag({ scope, householdName, className }: Readonly<Props>) {
  const { t } = useTranslation();

  if (scope !== "shared") {
    return null;
  }

  return (
    <Tag tone="accent" className={className}>
      {t("sharing.sharedWith", { household: householdName ?? "" })}
    </Tag>
  );
}
