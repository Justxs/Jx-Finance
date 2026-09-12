import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Props {
  onRetry?: () => void;
  retrying?: boolean;
  message?: string;
  className?: string;
}

export function ErrorState({ onRetry, retrying, message, className }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <p role="alert" className={cn("px-6 py-8 text-sm text-muted-foreground", className)}>
      {message ?? t("errors.loadFailed")}{" "}
      {onRetry ? (
        <button
          type="button"
          disabled={retrying}
          onClick={onRetry}
          className="font-medium text-primary underline-offset-4 hover:underline disabled:no-underline disabled:opacity-60"
        >
          {retrying ? t("errors.retrying") : t("errors.retry")}
        </button>
      ) : null}
    </p>
  );
}
