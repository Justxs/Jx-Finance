import { FileUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccountsSuspense, useListImportInboxSuspense } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { TitledSection } from "@/components/ui/section/section";
import { ButtonSkeleton } from "@/components/ui/skeleton/skeleton";
import { TextLink } from "@/components/ui/text-link/text-link";
import { ImportDialog } from "@/features/imports/import-dialog/import-dialog";
import { useSettings } from "@/hooks/use-settings";

function ImportActions() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const accounts = useAccountsSuspense();
  const accountList = accounts.data;
  const waiting = useListImportInboxSuspense().data.length;

  if (accountList.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        {t("imports.noAccounts")} <TextLink to="/accounts">{t("imports.goToAccounts")}</TextLink>
      </p>
    );
  }

  return (
    <div className="mt-4">
      {waiting > 0 ? (
        <p className="mb-3 text-sm">{t("imports.inbox.waiting", { count: waiting })}</p>
      ) : null}
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp />
        {t("imports.open")}
      </Button>
      <ImportDialog open={open} onOpenChange={setOpen} accounts={accountList} />
    </div>
  );
}

export function ImportDataSection() {
  const { t } = useTranslation();
  const settings = useSettings();

  if (!settings.features.import) {
    return null;
  }

  return (
    <TitledSection title={t("imports.sectionTitle")} description={t("imports.sectionDescription")}>
      <QueryBoundary
        fallback={
          <div className="mt-4">
            <ButtonSkeleton className="w-40" />
          </div>
        }
        errorSubject={t("imports.sectionTitle")}
      >
        <ImportActions />
      </QueryBoundary>
    </TitledSection>
  );
}
