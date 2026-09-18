import { useTranslation } from "react-i18next";
import type { ApiError } from "@/api/client";

function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "status" in error;
}

function messageKey(error: unknown) {
  if (!isApiError(error) || error.status !== 400) {
    return "imports.errorGeneric";
  }
  return error.errors?.some((detail) => detail.name.toLowerCase() === "file")
    ? "imports.errorFileSize"
    : "imports.errorFormat";
}

export function ImportPreviewError({ error }: Readonly<{ error: unknown }>) {
  const { t } = useTranslation();
  const key = messageKey(error);

  return (
    <div role="alert" className="space-y-1 text-sm">
      <p className="font-medium text-expense">{t(key)}</p>
      {key === "imports.errorGeneric" ? null : (
        <p className="text-muted-foreground">{t("imports.errorFix")}</p>
      )}
    </div>
  );
}
