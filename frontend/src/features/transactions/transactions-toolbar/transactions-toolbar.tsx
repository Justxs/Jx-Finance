import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, buttonVariants } from "@/components/ui/button";

interface Props {
  exportUrl: string;
  exportPdfUrl: string;
  filtered: boolean;
  onClearFilters: () => void;
}

export function TransactionsToolbar({
  exportUrl,
  exportPdfUrl,
  filtered,
  onClearFilters,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-1">
      {filtered ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
          {t("transactions.clearFilters")}
        </Button>
      ) : null}
      <a href={exportUrl} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <Download />
        {t("transactions.exportCsv")}
      </a>
      <a href={exportPdfUrl} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <Download />
        {t("transactions.exportPdf")}
      </a>
    </div>
  );
}
