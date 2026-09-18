import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

export function RoutePending() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <span className="sr-only">{t("errors.loading")}</span>
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
