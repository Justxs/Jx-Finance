import { linkOptions } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Coins,
  DatabaseBackup,
  FileUp,
  Globe,
  House,
  Mail,
  MessagesSquare,
  MonitorSmartphone,
  Palette,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  ToggleRight,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useMeSuspense } from "@/api/generated";
import { SectionLayout } from "@/components/section-layout/section-layout";
import {
  SectionNav,
  type SectionNavGroup,
  type SectionNavItem,
} from "@/components/section-nav/section-nav";
import { useSettings } from "@/hooks/use-settings";
import type { TranslationKey } from "@/lib/i18n";
import { UserRole } from "@/lib/user-role";

export const profileSections = [
  "account",
  "security",
  "sessions",
  "notifications",
  "appearance",
  "trash",
  "import",
] as const;

export const settingsSections = [
  "general",
  "features",
  "currencies",
  "regional",
  "defaults",
  "email",
  "discord",
  "backups",
] as const;

type ProfileSection = (typeof profileSections)[number];

export type SettingsSection = (typeof settingsSections)[number];

type SettingsPage = ProfileSection | SettingsSection | "households" | "users";

const profileItems: Record<ProfileSection, [TranslationKey, LucideIcon]> = {
  account: ["profile.detailsTitle", UserRound],
  security: ["profile.twoFactorTitle", ShieldCheck],
  sessions: ["profile.sessions.title", MonitorSmartphone],
  notifications: ["profile.notifications.title", Bell],
  appearance: ["settings.appearance", Palette],
  trash: ["trash.title", Trash2],
  import: ["imports.sectionTitle", FileUp],
};

const settingsItems: Record<SettingsSection, [TranslationKey, LucideIcon]> = {
  general: ["settings.general.title", Settings2],
  features: ["settings.features.title", ToggleRight],
  currencies: ["settings.currencies.title", Coins],
  regional: ["settings.regional.title", Globe],
  defaults: ["settings.defaults.title", SlidersHorizontal],
  email: ["settings.smtp.title", Mail],
  discord: ["settings.discord.title", MessagesSquare],
  backups: ["backup.title", DatabaseBackup],
};

function useSettingsGroups(): SectionNavGroup[] {
  const { features } = useSettings();
  const isAdmin = useMeSuspense().data.role === UserRole.admin;

  const personal: SectionNavItem[] = profileSections
    .filter((section) => section !== "import" || features.import)
    .map((section) => {
      const [labelKey, icon] = profileItems[section];
      return {
        id: section,
        labelKey,
        icon,
        link: linkOptions({ to: "/profile", search: { section } }),
      };
    });

  const shared: SectionNavItem[] = features.households
    ? [
        {
          id: "households",
          labelKey: "nav.households",
          icon: House,
          link: linkOptions({ to: "/households" }),
        },
      ]
    : [];

  const installation: SectionNavItem[] = isAdmin
    ? [
        ...settingsSections.map((section) => {
          const [labelKey, icon] = settingsItems[section];
          return {
            id: section,
            labelKey,
            icon,
            link: linkOptions({ to: "/settings", search: { section } }),
          };
        }),
        { id: "users", labelKey: "nav.users", icon: Users, link: linkOptions({ to: "/users" }) },
      ]
    : [];

  const groups: SectionNavGroup[] = [
    { labelKey: "settingsHub.personal", items: personal },
    { labelKey: "settingsHub.shared", items: shared },
    { labelKey: "settingsHub.installation", items: installation },
  ];
  return groups.filter((group) => group.items.length > 0);
}

interface Props {
  current: SettingsPage;
  children: ReactNode;
}

export function SettingsLayout({ current, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const me = useMeSuspense();
  const groups = useSettingsGroups();

  return (
    <SectionLayout
      title={t("nav.settings")}
      description={me.data.email}
      nav={<SectionNav labelKey="settingsHub.nav" current={current} groups={groups} />}
    >
      {children}
    </SectionLayout>
  );
}
