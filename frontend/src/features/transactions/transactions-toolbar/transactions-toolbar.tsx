import { useTranslation } from "react-i18next";
import { ExportMenu } from "@/components/export-menu";
import { Button } from "@/components/ui/button";

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
      <ExportMenu csvUrl={exportUrl} pdfUrl={exportPdfUrl} />
    </div>
  );
}
