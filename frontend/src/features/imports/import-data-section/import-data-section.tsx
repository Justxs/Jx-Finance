import { Link } from "@tanstack/react-router";
import { FileUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccountsSuspense } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/use-settings";
import { ImportDialog } from "../import-dialog";

function ImportActions() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const accounts = useAccountsSuspense();
  const accountList = accounts.data ?? [];

  if (accountList.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        {t("imports.noAccounts")}{" "}
        <Link
          to="/accounts"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("imports.goToAccounts")}
        </Link>
      </p>
    );
  }

  return (
    <div className="mt-4">
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
    <section className="section" aria-labelledby="import-data-title">
      <h2 id="import-data-title" className="section-title">
        {t("imports.sectionTitle")}
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        {t("imports.sectionDescription")}
      </p>
      <QueryBoundary
        fallback={<Skeleton className="mt-4 h-9 w-48" />}
        errorSubject={t("imports.sectionTitle")}
      >
        <ImportActions />
      </QueryBoundary>
    </section>
  );
}
