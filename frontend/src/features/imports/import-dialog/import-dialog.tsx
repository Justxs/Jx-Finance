import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CsvMappingResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { RowsSkeleton } from "@/components/ui/skeleton/skeleton";
import { CsvMappingForm } from "../csv-mapping-form/csv-mapping-form";
import { ImportSection } from "../import-section/import-section";
import { ImportUploadFormSkeleton } from "../import-section/import-upload-form";
import { type ImportProvider, ImportProviders } from "./import-providers";

interface PendingDiscard {
  run: () => void;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountResponse[];
  initialAccountId?: string;
}

export function ImportDialog({ open, onOpenChange, accounts, initialAccountId }: Readonly<Props>) {
  const { t } = useTranslation();
  const [provider, setProvider] = useState<ImportProvider | null>(null);
  const [editing, setEditing] = useState<CsvMappingResponse | null>(null);
  const [edited, setEdited] = useState(false);
  const [pendingDiscard, setPendingDiscard] = useState<PendingDiscard | null>(null);

  function confirmDiscard(run: () => void) {
    if (edited) {
      setPendingDiscard({ run });
    } else {
      run();
    }
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    confirmDiscard(() => {
      setProvider(null);
      setEditing(null);
      onOpenChange(false);
    });
  }

  function title() {
    if (editing) {
      return t("imports.mapping.editTitle", { name: editing.name });
    }
    return provider
      ? t("imports.dialogProviderTitle", { provider: provider.name })
      : t("imports.dialogTitle");
  }

  function body() {
    if (editing) {
      return (
        <CsvMappingForm
          initial={editing}
          onSaved={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      );
    }
    if (!provider) {
      return (
        <QueryBoundary fallback={<RowsSkeleton rows={3} lines={2} />}>
          <ImportProviders onChoose={setProvider} onEdit={setEditing} />
        </QueryBoundary>
      );
    }
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          className="-ml-2"
          onClick={() => confirmDiscard(() => setProvider(null))}
        >
          <ArrowLeft />
          {t("imports.allProviders")}
        </Button>
        <QueryBoundary fallback={<ImportUploadFormSkeleton />}>
          <ImportSection
            accounts={accounts}
            format={provider.format}
            mapping={provider.mapping}
            initialAccountId={initialAccountId}
            onEditedChange={setEdited}
            confirmDiscard={confirmDiscard}
          />
        </QueryBoundary>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={title()}
      description={provider || editing ? t("imports.pageDescription") : t("imports.chooseProvider")}
      className={provider || editing ? "sm:max-w-6xl" : undefined}
    >
      {body()}
      <ConfirmDeleteDialog
        target={pendingDiscard}
        title={t("imports.discard.title")}
        description={t("imports.discard.description")}
        confirmLabel={t("imports.discard.confirm")}
        onCancel={() => setPendingDiscard(null)}
        onConfirm={(pending) => {
          setEdited(false);
          pending.run();
        }}
      />
    </Modal>
  );
}
