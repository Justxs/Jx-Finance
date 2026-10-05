import { useTranslation } from "react-i18next";
import { useSmtpSettingsSuspense } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SmtpFormSkeleton } from "@/features/settings/settings-page/settings-page-pending";
import { SmtpForm } from "./smtp-form";

function SmtpSettings() {
  return <SmtpForm settings={useSmtpSettingsSuspense().data} />;
}

export function SmtpSection() {
  const { t } = useTranslation();

  return (
    <>
      <p className="max-w-prose text-sm text-muted-foreground">{t("settings.smtp.description")}</p>
      <QueryBoundary fallback={<SmtpFormSkeleton />} errorSubject={t("settings.smtp.title")}>
        <SmtpSettings />
      </QueryBoundary>
    </>
  );
}
