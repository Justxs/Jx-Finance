import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Props {
  onRetry?: () => void;
  subject?: string;
  className?: string;
}

export function ErrorState({ onRetry, subject, className }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <p role="alert" className={cn("py-6 text-sm text-foreground", className)}>
      {subject ? t("errors.loadFailedNamed", { subject }) : t("errors.loadFailed")}{" "}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("errors.retry")}
          {subject ? <span className="sr-only">: {subject}</span> : null}
        </button>
      ) : null}
    </p>
  );
}
