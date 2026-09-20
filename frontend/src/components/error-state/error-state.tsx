import { CircleAlert, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import { cn } from "@/lib/utils";

interface Props {
  onRetry?: () => void;
  subject?: string;
  className?: string;
}

export function ErrorState({ onRetry, subject, className }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className={cn("flex flex-wrap items-start gap-x-3 gap-y-3 py-2 text-sm", className)}
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-expense" />
      <div className="min-w-48 flex-1">
        <p className="font-medium text-foreground">
          {subject ? t("errors.loadFailedNamed", { subject }) : t("errors.loadFailed")}
        </p>
        <p className="mt-0.5 text-muted-foreground">{t("errors.loadHint")}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          {t("errors.retry")}
          {subject ? <span className="sr-only">: {subject}</span> : null}
        </Button>
      ) : null}
    </div>
  );
}
