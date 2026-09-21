import { useMutation } from "@tanstack/react-query";
import { ChevronDown, Download, FileSpreadsheet, FileText, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchFile } from "@/api/client";
import { Button } from "@/components/ui/button/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover/popover";
import { saveFile } from "@/lib/save-file";

interface Props {
  csvUrl: string;
  pdfUrl: string;
}

const itemClass =
  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted";

function FormatLabel({
  icon: Icon,
  label,
  hint,
}: Readonly<{ icon: LucideIcon; label: string; hint: ReactNode }>) {
  return (
    <>
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </>
  );
}

export function ExportMenu({ csvUrl, pdfUrl }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const pdfMutation = useMutation({
    mutationFn: () => fetchFile(pdfUrl),
    onSuccess: (file) => saveFile(file.blob, file.filename ?? "transactions.pdf"),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="ghost" size="sm" />}>
        <Download />
        {t("export.button")}
        <ChevronDown aria-hidden="true" className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" aria-label={t("export.chooseFormat")} className="w-64 p-1.5">
        <p className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
          {t("export.chooseFormat")}
        </p>
        <ul>
          <li>
            <a
              href={csvUrl}
              aria-label={`CSV. ${t("export.csvHint")}`}
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <FormatLabel icon={FileSpreadsheet} label="CSV" hint={t("export.csvHint")} />
            </a>
          </li>
          <li>
            <button
              type="button"
              aria-label={`PDF. ${t("export.pdfHint")}`}
              aria-busy={pdfMutation.isPending || undefined}
              disabled={pdfMutation.isPending}
              className={itemClass}
              onClick={() => {
                setOpen(false);
                pdfMutation.mutate();
              }}
            >
              <FormatLabel icon={FileText} label="PDF" hint={t("export.pdfHint")} />
            </button>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
