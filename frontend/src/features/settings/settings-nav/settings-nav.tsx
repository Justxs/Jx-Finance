import {
  Coins,
  DatabaseBackup,
  FileUp,
  Globe,
  type LucideIcon,
  Palette,
  Settings2,
  SlidersHorizontal,
  ToggleRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionNav } from "@/components/section-nav";
import type { TranslationKey } from "@/lib/i18n";

export const settingsSections = [
  "general",
  "features",
  "currencies",
  "regional",
  "defaults",
  "import",
  "backups",
  "appearance",
] as const;

export type SettingsSection = (typeof settingsSections)[number];

const items: Record<SettingsSection, { labelKey: TranslationKey; icon: LucideIcon }> = {
  general: { labelKey: "settings.general.title", icon: Settings2 },
  features: { labelKey: "settings.features.title", icon: ToggleRight },
  currencies: { labelKey: "settings.currencies.title", icon: Coins },
  regional: { labelKey: "settings.regional.title", icon: Globe },
  defaults: { labelKey: "settings.defaults.title", icon: SlidersHorizontal },
  import: { labelKey: "imports.sectionTitle", icon: FileUp },
  backups: { labelKey: "backup.title", icon: DatabaseBackup },
  appearance: { labelKey: "settings.appearance", icon: Palette },
};

interface Props {
  current: SettingsSection;
  sections: readonly SettingsSection[];
}

export function SettingsNav({ current, sections }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <SectionNav
      to="/settings"
      label={t("settings.sectionsNav")}
      current={current}
      items={sections.map((section) => ({
        id: section,
        label: t(items[section].labelKey),
        icon: items[section].icon,
      }))}
    />
  );
}
