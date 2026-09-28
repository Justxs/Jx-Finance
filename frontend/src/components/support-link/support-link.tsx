import { Coffee } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { TitledSection } from "@/components/ui/section/section";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { cn } from "@/lib/utils";
import { savePreferences, usePreferences } from "@/stores/preferences";

export const SUPPORT_URL = "https://ko-fi.com/justxs";

export function SupportLink({ collapsed = false }: Readonly<{ collapsed?: boolean }>) {
  const { t } = useTranslation();
  const hidden = usePreferences().supportLinkHidden;
  if (hidden) {
    return null;
  }

  return (
    <Tooltip content={collapsed ? t("support.link") : undefined} side="right">
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={collapsed ? t("support.link") : undefined}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        <Coffee aria-hidden="true" className="size-4 shrink-0" />
        {collapsed ? null : t("support.link")}
      </a>
    </Tooltip>
  );
}

export function SupportLinkSetting() {
  const { t } = useTranslation();
  const id = useId();
  const hidden = usePreferences().supportLinkHidden;

  return (
    <TitledSection title={t("support.title")} description={t("support.description")}>
      <label htmlFor={id} className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
        <Checkbox
          id={id}
          checked={!hidden}
          onCheckedChange={(shown) => savePreferences({ supportLinkHidden: !shown })}
        />
        {t("support.show")}
      </label>
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <Coffee aria-hidden="true" className="size-4" />
        {t("support.link")}
      </a>
    </TitledSection>
  );
}
