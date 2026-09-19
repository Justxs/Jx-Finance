import { useTranslation } from "react-i18next";
import { RowsSkeleton, Skeleton, StatsSkeleton } from "@/components/ui/skeleton";

export function RoutePending() {
  const { t } = useTranslation();

  return (
    <div className="space-y-5" role="status" aria-busy="true">
      <span className="sr-only">{t("errors.loading")}</span>
      <div className="space-y-2">
        <Skeleton className="h-9 w-48 max-w-full rounded-sm" />
        <Skeleton className="h-4 w-28 rounded-sm" />
      </div>
      <StatsSkeleton />
      <div className="space-y-4">
        <Skeleton className="h-6 w-40 rounded-sm" />
        <RowsSkeleton rows={6} />
      </div>
    </div>
  );
}
