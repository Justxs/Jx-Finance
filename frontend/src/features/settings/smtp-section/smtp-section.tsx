import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSendTestEmail, useSmtpSettingsSuspense, useUpdateSmtpSettings } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { TitledSection } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { silent } from "@/lib/mutations";
import { SmtpForm } from "./smtp-form";

function SmtpSettings() {
  const { t } = useTranslation();
  const settings = useSmtpSettingsSuspense();

  const saveMutation = useUpdateSmtpSettings({
    mutation: {
      onSuccess: () => {
        toast.success(t("settings.smtp.saved"));
      },
    },
  });

  const testMutation = useSendTestEmail(
    silent({
      onSuccess: (result: { sentTo: string }) => {
        toast.success(t("settings.smtp.testSent", { email: result.sentTo }));
      },
    }),
  );

  const saved = settings.data;

  return (
    <SmtpForm
      key={JSON.stringify(saved)}
      settings={saved}
      pending={saveMutation.isPending}
      testPending={testMutation.isPending}
      testError={testMutation.error}
      onSubmit={(values, onSaved) =>
        saveMutation.mutateAsync({ data: values }, { onSuccess: onSaved })
      }
      onTest={() => {
        testMutation.reset();
        testMutation.mutate();
      }}
    />
  );
}

export function SmtpSection() {
  const { t } = useTranslation();

  return (
    <TitledSection title={t("settings.smtp.title")} description={t("settings.smtp.description")}>
      <QueryBoundary fallback={<Skeleton className="mt-4 h-72 w-full" />}>
        <SmtpSettings />
      </QueryBoundary>
    </TitledSection>
  );
}
