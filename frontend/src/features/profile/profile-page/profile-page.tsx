import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMeSuspense } from "@/api/generated";
import { AppearancePicker } from "@/components/appearance-picker/appearance-picker";
import { SectionLayout } from "@/components/section-layout/section-layout";
import { ImportDataSection } from "@/features/imports/import-data-section/import-data-section";
import { useSettings } from "@/hooks/use-settings";
import { ProfileForm } from "../profile-form/profile-form";
import { ProfileNav, profileSections } from "../profile-nav/profile-nav";
import { SessionsSection } from "../sessions-section/sessions-section";
import { TrashSection } from "../trash-section/trash-section";
import { TwoFactorSettings } from "../two-factor-settings";

export function ProfilePage() {
  const { t } = useTranslation();
  const me = useMeSuspense();
  const search = useSearch({ from: "/profile" });
  const { features } = useSettings();
  const sections = profileSections.filter((item) => item !== "import" || features.import);
  const section = sections.find((item) => item === search.section) ?? "account";

  return (
    <SectionLayout
      title={t("profile.title")}
      description={me.data.email}
      nav={<ProfileNav current={section} sections={sections} />}
    >
      {section === "account" ? <ProfileForm profile={me.data} /> : null}
      {section === "security" ? <TwoFactorSettings /> : null}
      {section === "sessions" ? <SessionsSection /> : null}
      {section === "trash" ? <TrashSection /> : null}
      {section === "import" ? <ImportDataSection /> : null}
      {section === "appearance" ? <AppearancePicker /> : null}
    </SectionLayout>
  );
}
