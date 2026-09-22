import { Link } from "@tanstack/react-router";
import { FileUp, MonitorSmartphone, Palette, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { SectionNav, type SectionNavItem } from "@/components/section-nav/section-nav";

export const profileSections = [
  "account",
  "security",
  "sessions",
  "trash",
  "import",
  "appearance",
] as const;

export type ProfileSection = (typeof profileSections)[number];

const items: Record<ProfileSection, SectionNavItem> = {
  account: { labelKey: "profile.detailsTitle", icon: UserRound },
  security: { labelKey: "profile.twoFactorTitle", icon: ShieldCheck },
  sessions: { labelKey: "profile.sessions.title", icon: MonitorSmartphone },
  trash: { labelKey: "trash.title", icon: Trash2 },
  import: { labelKey: "imports.sectionTitle", icon: FileUp },
  appearance: { labelKey: "settings.appearance", icon: Palette },
};

interface Props {
  current: ProfileSection;
  sections: readonly ProfileSection[];
}

export function ProfileNav({ current, sections }: Readonly<Props>) {
  return (
    <SectionNav
      labelKey="profile.sectionsNav"
      current={current}
      sections={sections}
      items={items}
      renderLink={(section, props) => <Link to="/profile" search={{ section }} {...props} />}
    />
  );
}
