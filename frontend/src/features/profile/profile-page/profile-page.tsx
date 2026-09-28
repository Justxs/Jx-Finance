import { useSearch } from "@tanstack/react-router";
import { useMeSuspense } from "@/api/generated";
import { AppearancePicker } from "@/components/appearance-picker/appearance-picker";
import { useNavSections } from "@/components/section-nav/section-nav";
import { ImportDataSection } from "@/features/imports/import-data-section/import-data-section";
import { SettingsLayout, profileSections } from "@/features/settings/settings-nav/settings-nav";
import { NotificationsSection } from "../notifications-section/notifications-section";
import { ProfileForm } from "../profile-form/profile-form";
import { SessionsSection } from "../sessions-section/sessions-section";
import { TrashSection } from "../trash-section/trash-section";
import { TwoFactorSettings } from "../two-factor-settings";

export function ProfilePage() {
  const me = useMeSuspense();
  const search = useSearch({ from: "/profile" });
  const { section } = useNavSections(profileSections, search.section, "account");

  return (
    <SettingsLayout current={section}>
      {section === "account" ? <ProfileForm profile={me.data} /> : null}
      {section === "security" ? <TwoFactorSettings /> : null}
      {section === "sessions" ? <SessionsSection /> : null}
      {section === "notifications" ? <NotificationsSection /> : null}
      {section === "trash" ? <TrashSection /> : null}
      {section === "import" ? <ImportDataSection /> : null}
      {section === "appearance" ? <AppearancePicker /> : null}
    </SettingsLayout>
  );
}
