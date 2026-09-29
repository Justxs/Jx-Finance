import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useReceiptSettingsSuspense,
  useTestReceiptKey,
  useUpdateReceiptSettings,
} from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { TitledSection } from "@/components/ui/section/section";
import { notify, silent } from "@/lib/mutations";
import { SmtpFormSkeleton } from "../settings-page/settings-page-pending";
import { ReceiptsForm } from "./receipts-form";

function ReceiptSettings() {
  const { t } = useTranslation();
  const settings = useReceiptSettingsSuspense();

  const saveMutation = useUpdateReceiptSettings(notify(t("settings.receipts.saved")));

  const testMutation = useTestReceiptKey(
    silent({ onSuccess: () => toast.success(t("settings.receipts.testPassed")) }),
  );

  const saved = settings.data;

  return (
    <ReceiptsForm
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

export function ReceiptsSection() {
  const { t } = useTranslation();

  return (
    <TitledSection
      title={t("settings.receipts.title")}
      description={t("settings.receipts.description")}
    >
      <QueryBoundary fallback={<SmtpFormSkeleton />}>
        <ReceiptSettings />
      </QueryBoundary>
    </TitledSection>
  );
}
