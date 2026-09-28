import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import { cn } from "@/lib/utils";

interface Props extends ComponentProps<"p"> {
  filtered?: boolean;
  size?: "default" | "sm";
  action?: ReactNode;
  onClearFilters?: () => void;
}

export function EmptyText({
  filtered = false,
  size = "default",
  action,
  onClearFilters,
  className,
  children,
  ...props
}: Readonly<Props>) {
  const { t } = useTranslation();
  const clearFilters = onClearFilters ? (
    <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
      {t("filters.clearAll")}
    </Button>
  ) : null;
  const shownAction = filtered ? clearFilters : action;

  return (
    <p
      data-slot="empty-text"
      className={cn(
        "text-sm text-muted-foreground",
        size === "sm" ? "py-2" : "py-6",
        shownAction && "flex flex-wrap items-center gap-x-3 gap-y-2",
        className,
      )}
      {...props}
    >
      {filtered ? t("filters.noMatches") : children}
      {shownAction}
    </p>
  );
}
