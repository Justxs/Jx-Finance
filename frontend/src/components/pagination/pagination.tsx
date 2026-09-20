import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";

interface Props {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pages, onPageChange }: Readonly<Props>) {
  const { t } = useTranslation();

  if (pages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm">
      <span className="text-muted-foreground tabular-nums">
        {t("pagination.pageOf", { page, pages })}
      </span>
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
