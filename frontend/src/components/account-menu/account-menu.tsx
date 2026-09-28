import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, Keyboard, Languages, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLogout, useMeSuspense } from "@/api/generated";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu/menu";
import { endSession } from "@/lib/auth-gate";
import { cn } from "@/lib/utils";
import { localeNames, nextLocale, useLocale } from "@/stores/app-store";
import { setShortcutsHelpOpen } from "@/stores/shortcuts-help-store";
import { useTheme } from "@/stores/theme-store";

function initials(name: string | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "?";
  }

  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

interface Props {
  compact?: boolean;
  side?: "top" | "right" | "bottom";
  align?: "start" | "end";
  className?: string;
}

export function AccountMenu({
  compact = false,
  side = "top",
  align = "start",
  className,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMeSuspense();
  const { locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const name = me.data?.displayName || t("nav.profile");
  const email = me.data?.email;

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => endSession(queryClient, navigate),
    },
  });

  return (
    <Menu>
      <MenuTrigger
        render={
          <button
            type="button"
            aria-label={`${name}, ${t("nav.accountMenu")}`}
            className={cn(
              "flex min-w-0 items-center gap-2.5 rounded-md p-1.5 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-accent",
              className,
            )}
          />
        }
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
          {initials(me.data?.displayName)}
        </span>
        {compact ? null : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{email}</span>
          </span>
        )}
        {compact ? null : (
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        )}
      </MenuTrigger>
      <MenuContent side={side} align={align} className="w-60">
        {compact ? (
          <>
            <div className="min-w-0 px-2 py-1.5">
              <p className="truncate font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <MenuSeparator />
          </>
        ) : null}
        <MenuLinkItem render={<Link to="/profile" />}>
          <UserRound />
          {t("nav.profile")}
        </MenuLinkItem>
        <MenuItem closeOnClick={false} onClick={() => setLocale(nextLocale[locale])}>
          <Languages />
          {t("appearance.language")}
          <span lang={locale} className="ml-auto text-xs text-muted-foreground">
            {localeNames[locale]}
          </span>
        </MenuItem>
        <MenuItem closeOnClick={false} onClick={toggleTheme}>
          {theme === "dark" ? <Moon /> : <Sun />}
          {t("appearance.theme")}
          <span className="ml-auto text-xs text-muted-foreground">
            {t(`appearance.themes.${theme}`)}
          </span>
        </MenuItem>
        <MenuItem className="pointer-coarse:hidden" onClick={() => setShortcutsHelpOpen(true)}>
          <Keyboard />
          {t("shortcuts.title")}
          <kbd
            aria-hidden="true"
            className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-sm border bg-muted/40 px-1 font-mono text-xs text-muted-foreground"
          >
            ?
          </kbd>
        </MenuItem>
        <MenuSeparator />
        <MenuItem disabled={logoutMutation.isPending} onClick={() => logoutMutation.mutate()}>
          <LogOut />
          {t("auth.logout")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
