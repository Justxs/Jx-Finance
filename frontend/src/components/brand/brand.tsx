import { useTranslation } from "react-i18next";
import { usePublicSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { markPath, markViewBox } from "./mark-paths";

interface MarkProps {
  className?: string;
  title?: string;
}

export function BrandMark({ className, title }: Readonly<MarkProps>) {
  return (
    <svg
      viewBox={markViewBox}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("h-8 w-auto shrink-0 fill-primary", className)}
    >
      <path fillRule="evenodd" d={markPath} />
    </svg>
  );
}

interface BrandProps {
  compact?: boolean;
  stacked?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { mark: "h-7", stackedMark: "h-12", text: "text-lg" },
  md: { mark: "h-8", stackedMark: "h-16", text: "text-xl" },
  lg: { mark: "h-11", stackedMark: "h-24", text: "text-[1.75rem]" },
} as const;

export function Brand({
  compact = false,
  stacked = false,
  size = "md",
  className,
}: Readonly<BrandProps>) {
  const { t } = useTranslation();
  const name = usePublicSettings()?.instanceName ?? null;

  if (compact) {
    return <BrandMark title={name ?? t("appName")} className={cn(sizes[size].mark, className)} />;
  }

  return (
    <span
      role="img"
      aria-label={name ?? t("appName")}
      className={cn(
        "inline-flex min-w-0 items-center",
        stacked ? "flex-col gap-3 text-center" : "gap-2.5",
        className,
      )}
    >
      <BrandMark className={stacked ? sizes[size].stackedMark : sizes[size].mark} />
      <span
        aria-hidden="true"
        className={cn(
          "max-w-full truncate font-serif leading-none font-semibold tracking-tight",
          sizes[size].text,
        )}
      >
        {name ?? t("brand.wordmark")}
      </span>
    </span>
  );
}
