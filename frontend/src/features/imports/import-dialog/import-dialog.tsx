import { ArrowLeft, ChevronRight, Landmark } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { Rows } from "@/components/ui/rows/rows";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { ImportSection } from "../import-section";

const providers = [
  { id: "swedbank", name: "Swedbank", formatKey: "imports.providers.swedbankFormat" },
] as const;

type ProviderId = (typeof providers)[number]["id"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountResponse[];
}

export function ImportDialog({ open, onOpenChange, accounts }: Readonly<Props>) {
  const { t } = useTranslation();
  const [providerId, setProviderId] = useState<ProviderId | null>(null);
  const provider = providers.find((item) => item.id === providerId);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setProviderId(null);
    }
    onOpenChange(next);
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={
        provider
          ? t("imports.dialogProviderTitle", { provider: provider.name })
          : t("imports.dialogTitle")
      }
      description={provider ? t("imports.pageDescription") : t("imports.chooseProvider")}
      className={provider ? "sm:max-w-6xl" : undefined}
    >
      {provider ? (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setProviderId(null)}>
            <ArrowLeft />
            {t("imports.allProviders")}
          </Button>
          <QueryBoundary fallback={<Skeleton className="h-64 w-full" />}>
            <ImportSection accounts={accounts} />
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
                  <span className="block text-sm font-medium">{item.name}</span>
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
    </Modal>
  );
}
