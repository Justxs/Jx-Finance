import { FlaskConical } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMe, useRemoveDemoData } from "@/api/generated";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { useSettings } from "@/hooks/use-settings";
import { silentQuery } from "@/lib/query-client";
import { UserRole } from "@/lib/user-role";

export function DemoDataBanner() {
  const { t } = useTranslation();
  const { demoData } = useSettings();
  const me = useMe({ query: silentQuery });
  const [confirming, setConfirming] = useState(false);

  const removeMutation = useRemoveDemoData({
    mutation: { meta: { silent: true, success: t("settings.demoData.removed") } },
  });

  if (!demoData || me.data?.role !== UserRole.admin) {
    return null;
  }

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-4">
      <FlaskConical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t("settings.demoData.title")}</p>
        <p className="text-sm text-muted-foreground">{t("settings.demoData.body")}</p>
        <FormError error={removeMutation.error} />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        pending={removeMutation.isPending}
        onClick={() => setConfirming(true)}
      >
        {t("settings.demoData.startForReal")}
      </Button>
      <ConfirmDeleteDialog
        target={confirming ? true : null}
        title={t("settings.demoData.confirmTitle")}
        description={t("settings.demoData.confirmDescription")}
        confirmLabel={t("settings.demoData.startForReal")}
        onCancel={() => setConfirming(false)}
        onConfirm={() => removeMutation.mutate()}
      />
    </div>
  );
}
