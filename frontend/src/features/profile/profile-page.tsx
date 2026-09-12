import { useTranslation } from "react-i18next";
import { useMeEndpointSuspense } from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "./profile-form";
import { TwoFactorSettings } from "./two-factor-settings";

export function ProfilePage() {
  const { t } = useTranslation();
  const me = useMeEndpointSuspense();

  return (
    <div className="space-y-6">
      <PageHeader title={t("profile.title")} />
      <ProfileForm profile={me.data} />
      <TwoFactorSettings />
    </div>
  );
}
