import { useTranslation } from "react-i18next";
import { isApiError } from "@/api/client";
import type { ErrorCode, StatementFormat } from "@/api/generated/model";
import type { TranslationKey } from "@/lib/i18n";

const explainedCodes = ["import.noStatementForAccount", "import.missingColumns"] as const;

export function problemDetail(error: unknown, code: ErrorCode) {
  return isApiError(error) ? error.errors?.find((detail) => detail.code === code) : undefined;
}

function explained(error: unknown) {
  return explainedCodes
    .map((code) => ({ code, detail: problemDetail(error, code) }))
    .find((item) => item.detail);
}

function messageKey(error: unknown, format: StatementFormat): TranslationKey {
  if (!isApiError(error) || error.status !== 400) {
    return "imports.errorGeneric";
  }
  const known = explained(error);
  if (known) {
    return `serverErrors.${known.code}`;
  }
  return error.errors?.some((detail) => detail.name.toLowerCase() === "file")
    ? "imports.errorFileSize"
    : `imports.formats.${format}.errorFormat`;
}

export function ImportPreviewError({
  error,
  format,
}: Readonly<{ error: unknown; format: StatementFormat }>) {
  const { t } = useTranslation();
  const key = messageKey(error, format);

  return (
    <div role="alert" className="space-y-1 text-sm">
      <p className="font-medium text-expense">
        {t(key, { reason: explained(error)?.detail?.reason })}
      </p>
      {key === "imports.errorFileSize" || key.endsWith("errorFormat") ? (
        <p className="text-muted-foreground">{t(`imports.formats.${format}.errorFix`)}</p>
      ) : null}
    </div>
  );
}
