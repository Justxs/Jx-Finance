import { useSearch } from "@tanstack/react-router";
import { useMeSuspense } from "@/api/generated";
import { AppearancePicker } from "@/components/appearance-picker/appearance-picker";
import { useNavSections } from "@/components/section-nav/section-nav";
import { SupportLinkSetting } from "@/components/support-link/support-link";
import { DashboardLayoutSection } from "@/features/dashboard/dashboard-customiser/dashboard-customiser";
import { ImportDataSection } from "@/features/imports/import-data-section/import-data-section";
import { SettingsLayout, profileSections } from "@/features/settings/settings-nav/settings-nav";
import { NotificationsSection } from "../notifications-section/notifications-section";
import { PasskeysSection } from "../passkeys-section/passkeys-section";
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
      {section === "security" ? <PasskeysSection /> : null}
      {section === "sessions" ? <SessionsSection /> : null}
      {section === "notifications" ? <NotificationsSection /> : null}
      {section === "dashboard" ? <DashboardLayoutSection /> : null}
      {section === "trash" ? <TrashSection /> : null}
      {section === "import" ? <ImportDataSection /> : null}
      {section === "appearance" ? <AppearancePicker /> : null}
      {section === "appearance" ? <SupportLinkSetting /> : null}
    </SettingsLayout>
  );
}
