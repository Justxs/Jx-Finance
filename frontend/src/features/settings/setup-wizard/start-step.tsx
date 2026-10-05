import { CircleCheck, Plus } from "lucide-react";
import { type ComponentType, ViewTransition, startTransition, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccountsSuspense, useLoadDemoData } from "@/api/generated";
import { FormError } from "@/components/form-error/form-error";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { SegmentedControl } from "@/components/ui/segmented-control/segmented-control";
import { ButtonSkeleton } from "@/components/ui/skeleton/skeleton";
import { AccountForm } from "@/features/accounts/account-form/account-form";
import { ImportDataForm } from "@/features/profile/export-data-panel/export-data-panel";
import { BackupList } from "@/features/settings/backup-section/backup-section";
import { BackupUploadForm } from "@/features/settings/backup-section/backup-upload-form";
import { BackupListSkeleton } from "@/features/settings/settings-page/settings-page-pending";
import { useSettingsSuspense } from "@/hooks/use-settings";
import { silentMutation } from "@/lib/mutations";

const choices = ["empty", "demo", "restore", "import"] as const;

type StartChoice = (typeof choices)[number];

function QuickAccounts() {
  const { t } = useTranslation();
  const accounts = useAccountsSuspense().data;
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      {accounts.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center gap-2">
              <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-income" />
              {account.name}
            </li>
          ))}
        </ul>
      ) : null}
      {adding ? (
        <AccountForm onClose={() => setAdding(false)} />
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)}>
          <Plus />
          {t("accounts.add")}
        </Button>
      )}
    </div>
  );
}

function DemoData() {
  const { t } = useTranslation();
  const loaded = useSettingsSuspense().demoData;
  const loadMutation = useLoadDemoData({ mutation: silentMutation });

  if (loaded) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm font-medium">
        <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-income" />
        {t("settings.setupWizard.start.demoLoaded")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <FormError error={loadMutation.error} />
      <Button type="button" pending={loadMutation.isPending} onClick={() => loadMutation.mutate()}>
        {t("settings.setupWizard.start.loadDemo")}
      </Button>
    </div>
  );
}

function Restore() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <BackupUploadForm />
      <QueryBoundary fallback={<BackupListSkeleton />} errorSubject={t("backup.title")}>
        <BackupList />
      </QueryBoundary>
    </div>
  );
}

const panels: Record<StartChoice, ComponentType> = {
  empty: QuickAccounts,
  demo: DemoData,
  restore: Restore,
  import: ImportDataForm,
};

export function StartStep() {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<StartChoice>("empty");
  const Panel = panels[choice];

  return (
    <div className="mt-6">
      <SegmentedControl
        aria-label={t("settings.setupWizard.start.choose")}
        value={choice}
        onChange={(next) => startTransition(() => setChoice(next))}
        options={choices.map((value) => ({
          value,
          label: t(`settings.setupWizard.start.choices.${value}.label`),
        }))}
      />
      <ViewTransition key={choice} enter="reveal-in" exit="none" update="none" share="none">
        <div>
          <p className="mt-3 max-w-prose text-sm text-muted-foreground">
            {t(`settings.setupWizard.start.choices.${choice}.description`)}
          </p>
          <div className="mt-4">
            <QueryBoundary fallback={<ButtonSkeleton className="w-36" />}>
              <Panel />
            </QueryBoundary>
          </div>
        </div>
      </ViewTransition>
    </div>
  );
}
