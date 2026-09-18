import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface Props {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pages, onPageChange }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm sm:px-6">
      <span className="text-muted-foreground">{t("pagination.pageOf", { page, pages })}</span>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("actions.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("actions.next")}
        </Button>
      </div>
    </div>
  );
}
