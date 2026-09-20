import { FileUp, type LucideIcon, Palette, ShieldCheck, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionNav } from "@/components/section-nav/section-nav";
import type { TranslationKey } from "@/lib/i18n";

export const profileSections = ["account", "security", "import", "appearance"] as const;

export type ProfileSection = (typeof profileSections)[number];

const items: Record<ProfileSection, { labelKey: TranslationKey; icon: LucideIcon }> = {
  account: { labelKey: "profile.detailsTitle", icon: UserRound },
  security: { labelKey: "profile.twoFactorTitle", icon: ShieldCheck },
  import: { labelKey: "imports.sectionTitle", icon: FileUp },
  appearance: { labelKey: "settings.appearance", icon: Palette },
};

interface Props {
  current: ProfileSection;
  sections: readonly ProfileSection[];
}

export function ProfileNav({ current, sections }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <SectionNav
      to="/profile"
      label={t("profile.sectionsNav")}
      current={current}
      items={sections.map((section) => ({
        id: section,
        label: t(items[section].labelKey),
        icon: items[section].icon,
      }))}
    />
  );
}
