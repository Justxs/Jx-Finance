import { useTranslation } from "react-i18next";
import { useSmtpSettingsSuspense } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { TitledSection } from "@/components/ui/section/section";
import { SmtpFormSkeleton } from "@/features/settings/settings-page/settings-page-pending";
import { SmtpForm } from "./smtp-form";

function SmtpSettings() {
  return <SmtpForm settings={useSmtpSettingsSuspense().data} />;
}

export function SmtpSection() {
  const { t } = useTranslation();

  return (
    <TitledSection title={t("settings.smtp.title")} description={t("settings.smtp.description")}>
      <QueryBoundary fallback={<SmtpFormSkeleton />}>
        <SmtpSettings />
      </QueryBoundary>
    </TitledSection>
  );
}
