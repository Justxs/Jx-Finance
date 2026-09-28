import { useTranslation } from "react-i18next";
import { TextLink } from "@/components/ui/text-link/text-link";

export interface ImportResult {
  imported: number;
  linked: number;
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
        {result.linked > 0 ? ` ${t("imports.resultLinked", { count: result.linked })}` : ""}
        {result.skipped > 0 ? ` ${t("imports.resultSkipped", { count: result.skipped })}` : ""}
      </span>{" "}
      {result.imported + result.linked > 0 ? (
        <TextLink
          to="/transactions"
          search={{
            page: 1,
            accountId: result.accountId,
            dateFrom: result.dateFrom,
            dateTo: result.dateTo,
          }}
        >
          {t("imports.resultLink")}
        </TextLink>
      ) : null}
    </p>
  );
}
