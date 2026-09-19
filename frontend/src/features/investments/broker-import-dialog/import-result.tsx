import { useTranslation } from "react-i18next";
import type { BrokerImportResponse } from "@/api/generated/model";

interface Props {
  result: BrokerImportResponse;
}

const resultKeys = [
  "trades",
  "cashEntries",
  "conversions",
  "transfers",
  "securitiesCreated",
  "pricesUpdated",
  "duplicates",
  "skipped",
] as const;

export function BrokerImportResult({ result }: Readonly<Props>) {
  const { t } = useTranslation();
  const lines = resultKeys.filter((key) => result[key] > 0);
  const imported = result.trades + result.cashEntries + result.conversions + result.transfers;

  return (
    <div className="border-y border-rule py-3 text-sm">
      <p className="font-semibold">
        {imported > 0
          ? t("investments.import.result.done")
          : t("investments.import.result.nothing")}
      </p>
      {lines.length > 0 ? (
        <ul className="mt-1 space-y-0.5 tabular-nums">
          {lines.map((key) => (
            <li
              key={key}
              className={key === "duplicates" || key === "skipped" ? "text-muted-foreground" : ""}
            >
              {t(`investments.import.result.${key}`, { count: result[key] })}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
