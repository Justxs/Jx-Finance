import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Props extends ComponentProps<"p"> {
  filtered?: boolean;
  size?: "default" | "sm";
}

export function EmptyText({
  filtered = false,
  size = "default",
  className,
  children,
  ...props
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <p
      data-slot="empty-text"
      className={cn("text-sm text-muted-foreground", size === "sm" ? "py-2" : "py-6", className)}
      {...props}
    >
      {filtered ? t("filters.noMatches") : children}
    </p>
  );
}
