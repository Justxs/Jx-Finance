import { useTranslation } from "react-i18next";
import { useMeEndpoint } from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileForm } from "./profile-form";
import { TwoFactorSettings } from "./two-factor-settings";

export function ProfilePage() {
  const { t } = useTranslation();
  const me = useMeEndpoint();

  if (me.isPending || !me.data) {
    return (
      <div className="space-y-8">
        <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
        <div className="card max-w-md space-y-4 p-6">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
      <ProfileForm profile={me.data} />
      <TwoFactorSettings />
    </div>
  );
}
