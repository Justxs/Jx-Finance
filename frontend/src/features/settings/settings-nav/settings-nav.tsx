import { Link } from "@tanstack/react-router";
import {
  Coins,
  DatabaseBackup,
  FileUp,
  Globe,
  Mail,
  Palette,
  Settings2,
  SlidersHorizontal,
  ToggleRight,
} from "lucide-react";
import { SectionNav, type SectionNavItem } from "@/components/section-nav/section-nav";

export const settingsSections = [
  "general",
  "features",
  "currencies",
  "regional",
  "defaults",
  "email",
  "import",
  "backups",
  "appearance",
] as const;

export type SettingsSection = (typeof settingsSections)[number];

const items: Record<SettingsSection, SectionNavItem> = {
  general: { labelKey: "settings.general.title", icon: Settings2 },
  features: { labelKey: "settings.features.title", icon: ToggleRight },
  currencies: { labelKey: "settings.currencies.title", icon: Coins },
  regional: { labelKey: "settings.regional.title", icon: Globe },
  defaults: { labelKey: "settings.defaults.title", icon: SlidersHorizontal },
  email: { labelKey: "settings.smtp.title", icon: Mail },
  import: { labelKey: "imports.sectionTitle", icon: FileUp },
  backups: { labelKey: "backup.title", icon: DatabaseBackup },
  appearance: { labelKey: "settings.appearance", icon: Palette },
};

interface Props {
  current: SettingsSection;
  sections: readonly SettingsSection[];
}

export function SettingsNav({ current, sections }: Readonly<Props>) {
  return (
    <SectionNav
      labelKey="settings.sectionsNav"
      current={current}
      sections={sections}
      items={items}
      renderLink={(section, props) => <Link to="/settings" search={{ section }} {...props} />}
    />
  );
}
