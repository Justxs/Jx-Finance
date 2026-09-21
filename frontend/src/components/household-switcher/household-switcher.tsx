import { useQueryClient } from "@tanstack/react-query";
import { House } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select/select";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { cn } from "@/lib/utils";
import { setActiveHousehold, useActiveHouseholdId } from "@/stores/active-household-store";

const EVERYTHING = "everything";

interface Props {
  collapsed?: boolean;
  className?: string;
}

export function HouseholdSwitcher({ collapsed = false, className }: Readonly<Props>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const households = useHouseholdsSuspense().data ?? [];
  const storedId = useActiveHouseholdId();

  if (households.length === 0) {
    return null;
  }

  const active = households.find((household) => household.id === storedId);
  const value = active?.id ?? EVERYTHING;
  const label = active?.name ?? t("households.scope.everything");
  const scopeLabel = `${t("households.scope.label")}: ${label}`;
  const options = [
    { value: EVERYTHING, label: t("households.scope.everything") },
    ...households.map((household) => ({ value: household.id, label: household.name })),
  ];

  function choose(next: string | null) {
    const chosen = options.find((option) => option.value === next);
    if (!chosen) {
      return;
    }
    setActiveHousehold(chosen.value === EVERYTHING ? undefined : chosen.value);
    void queryClient.invalidateQueries();
  }

  return (
    <Select items={options} value={value} onValueChange={choose}>
      <Tooltip content={collapsed ? scopeLabel : undefined} side="right">
        <SelectTrigger
          size="sm"
          aria-label={scopeLabel}
          className={cn("w-full min-w-0", collapsed && "justify-center gap-0 px-1", className)}
        >
          <House aria-hidden="true" className="text-muted-foreground" />
          {collapsed ? null : <span className="min-w-0 truncate text-sm">{label}</span>}
        </SelectTrigger>
      </Tooltip>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
