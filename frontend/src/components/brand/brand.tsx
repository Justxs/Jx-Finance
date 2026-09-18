import { useTranslation } from "react-i18next";
import { usePublicSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { markGlyphs, markRules, markViewBox } from "./mark-paths";

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
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="64" height="64" rx="10" className="fill-primary" />
      <g className="fill-primary-foreground">
        {markGlyphs.map((glyph) => (
          <path key={glyph} d={glyph} />
        ))}
        {markRules.map((rule) => (
          <rect key={rule.y} {...rule} />
        ))}
      </g>
    </svg>
  );
}

interface BrandProps {
  compact?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { mark: "size-7", text: "text-lg" },
  md: { mark: "size-8", text: "text-xl" },
  lg: { mark: "size-11", text: "text-[1.75rem]" },
} as const;

export function Brand({ compact = false, size = "md", className }: Readonly<BrandProps>) {
  const { t } = useTranslation();
  const name = usePublicSettings()?.instanceName ?? null;

  if (compact) {
    return <BrandMark title={name ?? t("appName")} className={cn(sizes[size].mark, className)} />;
  }

  return (
    <span
      role="img"
      aria-label={name ?? t("appName")}
      className={cn("inline-flex min-w-0 items-center gap-2.5", className)}
    >
      <BrandMark className={sizes[size].mark} />
      <span
        aria-hidden="true"
        className={cn(
          "truncate font-serif leading-none font-semibold tracking-tight",
          sizes[size].text,
        )}
      >
        {name ?? t("brand.wordmark")}
      </span>
    </span>
  );
}
