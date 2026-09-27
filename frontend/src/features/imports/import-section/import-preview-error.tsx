import { useTranslation } from "react-i18next";
import { isApiError } from "@/api/client";
import type { StatementFormat } from "@/api/generated/model";
import type { TranslationKey } from "@/lib/i18n";

function noStatementForAccount(error: unknown) {
  return isApiError(error)
    ? error.errors?.find((detail) => detail.code === "import.noStatementForAccount")
    : undefined;
}

function messageKey(error: unknown, format: StatementFormat): TranslationKey {
  if (!isApiError(error) || error.status !== 400) {
    return "imports.errorGeneric";
  }
  if (noStatementForAccount(error)) {
    return "serverErrors.import.noStatementForAccount";
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
        {t(key, { reason: noStatementForAccount(error)?.reason })}
      </p>
      {key === "imports.errorFileSize" || key.endsWith("errorFormat") ? (
        <p className="text-muted-foreground">{t(`imports.formats.${format}.errorFix`)}</p>
      ) : null}
    </div>
  );
}
