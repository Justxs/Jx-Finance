import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Props extends ComponentProps<"p"> {
  filtered?: boolean;
}

export function EmptyText({ filtered = false, className, children, ...props }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <p
      data-slot="empty-text"
      className={cn("py-6 text-sm text-muted-foreground", className)}
      {...props}
    >
      {filtered ? t("filters.noMatches") : children}
    </p>
  );
}
