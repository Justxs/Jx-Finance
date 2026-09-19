import { useTranslation } from "react-i18next";
import { useMeSuspense } from "@/api/generated";
import { FontPicker } from "@/components/font-picker";
import { PageHeader } from "@/components/page-header";
import { PalettePicker } from "@/components/palette-picker";
import { ProfileForm } from "../profile-form";
import { TwoFactorSettings } from "../two-factor-settings";

export function ProfilePage() {
  const { t } = useTranslation();
  const me = useMeSuspense();

  return (
    <div className="space-y-10">
      <PageHeader title={t("profile.title")} />
      <ProfileForm profile={me.data} />
      <TwoFactorSettings />
      <PalettePicker />
      <FontPicker />
    </div>
  );
}
