import { useSearch } from "@tanstack/react-router";
import { useMeSuspense } from "@/api/generated";
import { AppearancePicker } from "@/components/appearance-picker/appearance-picker";
import { pickSection } from "@/components/section-nav/section-nav";
import { SettingsLayout, profileSections } from "@/components/settings-layout/settings-layout";
import { SupportLinkSetting } from "@/components/support-link/support-link";
import { DashboardLayoutSection } from "@/features/dashboard/dashboard-customiser/dashboard-customiser";
import { ImportDataSection } from "@/features/imports/import-data-section/import-data-section";
import { ApiTokensSection } from "@/features/profile/api-tokens-section/api-tokens-section";
import { ExportDataPanel } from "@/features/profile/export-data-panel/export-data-panel";
import { NotificationsSection } from "@/features/profile/notifications-section/notifications-section";
import { PasskeysSection } from "@/features/profile/passkeys-section/passkeys-section";
import { ProfileForm } from "@/features/profile/profile-form/profile-form";
import { SessionsSection } from "@/features/profile/sessions-section/sessions-section";
import { TrashSection } from "@/features/profile/trash-section/trash-section";
import { TwoFactorSettings } from "@/features/profile/two-factor-settings/two-factor-settings";
import { useFeature } from "@/hooks/use-settings";

export function ProfilePage() {
  const me = useMeSuspense();
  const search = useSearch({ from: "/profile" });
  const section = pickSection(profileSections, search.section, "account");
  const apiTokens = useFeature("apiTokens");

  return (
    <SettingsLayout current={section}>
      {section === "account" ? <ProfileForm profile={me.data} /> : null}
      {section === "security" ? <TwoFactorSettings /> : null}
      {section === "security" ? <PasskeysSection /> : null}
      {section === "security" && apiTokens ? <ApiTokensSection /> : null}
      {section === "sessions" ? <SessionsSection /> : null}
      {section === "notifications" ? <NotificationsSection /> : null}
      {section === "dashboard" ? <DashboardLayoutSection /> : null}
      {section === "trash" ? <TrashSection /> : null}
      {section === "import" ? <ImportDataSection /> : null}
      {section === "import" ? <ExportDataPanel /> : null}
      {section === "appearance" ? <AppearancePicker /> : null}
      {section === "appearance" ? <SupportLinkSetting /> : null}
    </SettingsLayout>
  );
}
