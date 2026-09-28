import { ArrowLeft, ChevronRight, Landmark } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, StatementFormat } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { Rows } from "@/components/ui/rows/rows";
import { ImportSection } from "../import-section/import-section";
import { ImportUploadFormSkeleton } from "../import-section/import-upload-form";

const providers = [
  {
    id: "swedbankCsv",
    nameKey: "imports.providers.swedbank",
    formatKey: "imports.providers.swedbankFormat",
  },
  {
    id: "camt053",
    nameKey: "imports.providers.camt053",
    formatKey: "imports.providers.camt053Format",
  },
] as const;

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
  const [providerId, setProviderId] = useState<StatementFormat | null>(null);
  const [edited, setEdited] = useState(false);
  const [pendingDiscard, setPendingDiscard] = useState<PendingDiscard | null>(null);
  const provider = providers.find((item) => item.id === providerId);

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
      setProviderId(null);
      onOpenChange(false);
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={
        provider
          ? t("imports.dialogProviderTitle", { provider: t(provider.nameKey) })
          : t("imports.dialogTitle")
      }
      description={provider ? t("imports.pageDescription") : t("imports.chooseProvider")}
      className={provider ? "sm:max-w-6xl" : undefined}
    >
      {provider ? (
        <div className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            className="-ml-2"
            onClick={() => confirmDiscard(() => setProviderId(null))}
          >
            <ArrowLeft />
            {t("imports.allProviders")}
          </Button>
          <QueryBoundary fallback={<ImportUploadFormSkeleton />}>
            <ImportSection
              accounts={accounts}
              format={provider.id}
              initialAccountId={initialAccountId}
              onEditedChange={setEdited}
              confirmDiscard={confirmDiscard}
            />
          </QueryBoundary>
        </div>
      ) : (
        <Rows className="-my-2">
          {providers.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setProviderId(item.id)}
                className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted"
              >
                <Landmark aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t(item.nameKey)}</span>
                  <span className="block text-xs text-muted-foreground">{t(item.formatKey)}</span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </button>
            </li>
          ))}
        </Rows>
      )}
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
