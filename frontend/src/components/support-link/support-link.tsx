import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { TitledSection } from "@/components/ui/section/section";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { savePreferences, usePreferences } from "@/stores/preferences";

export const SUPPORT_URL = "https://ko-fi.com/justxs";

function KofiCup({ className }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("shrink-0", className)}>
      <path
        d="M3.5 6.5h13.5v6.8a5.2 5.2 0 0 1-5.2 5.2H8.7a5.2 5.2 0 0 1-5.2-5.2z"
        className="fill-kofi-cup stroke-kofi-ink"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M17 8.6h1.2a2.8 2.8 0 0 1 0 5.6H17"
        fill="none"
        className="stroke-kofi-ink"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10.25 15.3s-3.4-2-3.4-4.3a1.8 1.8 0 0 1 3.4-.85 1.8 1.8 0 0 1 3.4.85c0 2.3-3.4 4.3-3.4 4.3z"
        className="fill-kofi-heart"
      />
    </svg>
  );
}

function useSupportLinkShown() {
  const installationOn = useSettings().supportLinkEnabled;
  const hiddenHere = usePreferences().supportLinkHidden;
  return { installationOn, shown: installationOn && !hiddenHere, hiddenHere };
}

export function SupportLink({ collapsed = false }: Readonly<{ collapsed?: boolean }>) {
  const { t } = useTranslation();
  if (!useSupportLinkShown().shown) {
    return null;
  }

  return (
    <Tooltip
      content={collapsed ? t("support.tooltipCollapsed") : t("support.hideHint")}
      side="right"
    >
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={collapsed ? t("support.link") : undefined}
        className={cn(
          "flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          collapsed && "justify-center px-0",
        )}
      >
        <KofiCup className="-m-0.5 size-5" />
        {collapsed ? null : t("support.link")}
      </a>
    </Tooltip>
  );
}

export function SupportLinkSetting() {
  const { t } = useTranslation();
  const id = useId();
  const { installationOn, hiddenHere } = useSupportLinkShown();

  return (
    <TitledSection title={t("support.title")} description={t("support.description")}>
      {installationOn ? (
        <label htmlFor={id} className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
          <Checkbox
            id={id}
            checked={!hiddenHere}
            onCheckedChange={(shown) => savePreferences({ supportLinkHidden: !shown })}
          />
          {t("support.show")}
        </label>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{t("support.installationOff")}</p>
      )}
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <KofiCup className="size-5" />
        {t("support.link")}
      </a>
    </TitledSection>
  );
}
