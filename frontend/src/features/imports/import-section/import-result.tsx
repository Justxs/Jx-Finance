import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export interface ImportResult {
  imported: number;
  skipped: number;
  accountId: string;
  dateFrom: string;
  dateTo: string;
}

export function ImportResultLine({ result }: Readonly<{ result: ImportResult }>) {
  const { t } = useTranslation();

  return (
    <p role="status" className="text-sm text-foreground">
      <span className="tabular-nums">
        {t("imports.resultImported", { count: result.imported })}
        {result.skipped > 0 ? ` ${t("imports.resultSkipped", { count: result.skipped })}` : ""}
      </span>{" "}
      {result.imported > 0 ? (
        <Link
          to="/transactions"
          search={{
            page: 1,
            accountId: result.accountId,
            dateFrom: result.dateFrom,
            dateTo: result.dateTo,
          }}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("imports.resultLink")}
        </Link>
      ) : null}
    </p>
  );
}
