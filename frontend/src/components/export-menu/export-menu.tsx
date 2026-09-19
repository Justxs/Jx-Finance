import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  csvUrl: string;
  pdfUrl: string;
}

const itemClass =
  "flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted";

export function ExportMenu({ csvUrl, pdfUrl }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const formats = [
    { href: csvUrl, icon: FileSpreadsheet, label: "CSV", hint: t("export.csvHint") },
    { href: pdfUrl, icon: FileText, label: "PDF", hint: t("export.pdfHint") },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <Download />
        {t("export.button")}
        <ChevronDown aria-hidden="true" className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" aria-label={t("export.chooseFormat")} className="w-64 p-1.5">
        <p className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
          {t("export.chooseFormat")}
        </p>
        <ul>
          {formats.map((format) => (
            <li key={format.label}>
              <a
                href={format.href}
                aria-label={`${format.label}. ${format.hint}`}
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                <format.icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{format.label}</span>
                  <span className="block text-xs text-muted-foreground">{format.hint}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
