import { Download } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getExportMyDataUrl } from "@/api/generated";
import { buttonVariants } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { TitledSection } from "@/components/ui/section/section";

export function ExportDataPanel() {
  const { t } = useTranslation();
  const [attachments, setAttachments] = useState(false);

  return (
    <TitledSection
      title={t("profile.dataExport.title")}
      description={t("profile.dataExport.description")}
      bodyGap="md"
    >
      <p className="max-w-prose text-sm text-muted-foreground">
        {t("profile.dataExport.excluded")}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <a
          href={getExportMyDataUrl(attachments ? { attachments } : {})}
          className={buttonVariants({ variant: "outline" })}
        >
          <Download />
          {t("profile.dataExport.download")}
        </a>
        <label className="flex items-center gap-2.5 text-sm">
          <Checkbox checked={attachments} onCheckedChange={setAttachments} />
          <span>{t("profile.dataExport.attachments")}</span>
        </label>
      </div>
    </TitledSection>
  );
}
