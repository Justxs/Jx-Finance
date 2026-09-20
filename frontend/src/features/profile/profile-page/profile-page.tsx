import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMeSuspense } from "@/api/generated";
import { FontPicker } from "@/components/font-picker/font-picker";
import { PageHeader } from "@/components/page-header/page-header";
import { PalettePicker } from "@/components/palette-picker/palette-picker";
import { ImportDataSection } from "@/features/imports/import-data-section/import-data-section";
import { useSettings } from "@/hooks/use-settings";
import { ProfileForm } from "../profile-form/profile-form";
import { ProfileNav, profileSections } from "../profile-nav/profile-nav";
import { TwoFactorSettings } from "../two-factor-settings";

export function ProfilePage() {
  const { t } = useTranslation();
  const me = useMeSuspense();
  const search = useSearch({ from: "/profile" });
  const { features } = useSettings();
  const sections = profileSections.filter((item) => item !== "import" || features.import);
  const section = sections.find((item) => item === search.section) ?? "account";

  return (
    <div className="space-y-5">
      <PageHeader title={t("profile.title")} description={me.data.email} />
      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <ProfileNav current={section} sections={sections} />
        <div className="min-w-0 space-y-5">
          {section === "account" ? <ProfileForm profile={me.data} /> : null}
          {section === "security" ? <TwoFactorSettings /> : null}
          {section === "import" ? <ImportDataSection /> : null}
          {section === "appearance" ? (
            <>
              <PalettePicker />
              <FontPicker />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
