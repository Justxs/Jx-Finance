import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/brand/brand";

export function Splash() {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background"
      role="status"
      aria-label={t("errors.loading")}
    >
      <div className="relative grid size-32 place-items-center">
        <div className="absolute inset-0 rounded-full border-2 border-border" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary motion-reduce:animate-none" />
        <BrandMark className="h-[2.9rem]" />
      </div>
    </div>
  );
}
