import { useTranslation } from "react-i18next";
import type { BrokerImportResponse } from "@/api/generated/model";
import { ScrollRegion } from "@/components/ui/table/table";
import { useQuantityFormat } from "@/hooks/use-formatters";
import type { TranslationKey } from "@/lib/i18n";

interface Props {
  result: BrokerImportResponse;
}

const resultKeys = [
  "trades",
  "splits",
  "cashEntries",
  "conversions",
  "transfers",
  "securitiesCreated",
  "pricesUpdated",
  "duplicates",
  "skipped",
] as const;

const corporateActionNames: Readonly<Record<string, TranslationKey>> = {
  FS: "investments.import.corporateActions.FS",
  RS: "investments.import.corporateActions.RS",
  TC: "investments.import.corporateActions.TC",
  SO: "investments.import.corporateActions.SO",
  SD: "investments.import.corporateActions.SD",
  IC: "investments.import.corporateActions.IC",
  RI: "investments.import.corporateActions.RI",
  SR: "investments.import.corporateActions.SR",
  TO: "investments.import.corporateActions.TO",
  DW: "investments.import.corporateActions.DW",
  HI: "investments.import.corporateActions.HI",
  HD: "investments.import.corporateActions.HD",
  CD: "investments.import.corporateActions.CD",
  BM: "investments.import.corporateActions.BM",
  BC: "investments.import.corporateActions.BC",
};

export function BrokerImportResult({ result }: Readonly<Props>) {
  const { t } = useTranslation();
  const quantity = useQuantityFormat();
  const lines = resultKeys.filter((key) => result[key] > 0);
  const imported =
    result.trades + result.splits + result.cashEntries + result.conversions + result.transfers;
  const skippedActions = result.skippedCorporateActions;
  const mismatches = result.positionMismatches ?? [];

  function actionName(type: string) {
    const key = corporateActionNames[type.toUpperCase()];
    return key ? t(key) : t("investments.import.corporateActions.other", { type });
  }

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

      {skippedActions.length > 0 || mismatches.length > 0 ? (
        <div className="mt-3 space-y-3 border-t border-expense pt-2">
          <p className="font-medium text-expense">{t("investments.import.warning.title")}</p>

          {skippedActions.length > 0 ? (
            <div>
              <p>{t("investments.import.warning.skippedActions")}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 tabular-nums">
                {skippedActions.map((action) => (
                  <li key={action.type}>
                    {actionName(action.type)}: {action.count}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {mismatches.length > 0 ? (
            <div>
              <p>{t("investments.import.warning.mismatches")}</p>
              <ScrollRegion
                className="mt-1"
                aria-label={t("investments.import.warning.mismatchTable")}
              >
                <table className="w-full text-left tabular-nums">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-1 pr-3 font-medium">
                        {t("investments.import.warning.symbol")}
                      </th>
                      <th scope="col" className="py-1 pr-3 text-right font-medium">
                        {t("investments.import.warning.brokerQuantity")}
                      </th>
                      <th scope="col" className="py-1 text-right font-medium">
                        {t("investments.import.warning.replayedQuantity")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mismatches.map((mismatch) => (
                      <tr key={mismatch.symbol} className="border-t border-border">
                        <th scope="row" className="py-1 pr-3 font-medium">
                          {mismatch.symbol}
                        </th>
                        <td className="py-1 pr-3 text-right">
                          {quantity.format(Number(mismatch.brokerQuantity))}
                        </td>
                        <td className="py-1 text-right">
                          {quantity.format(Number(mismatch.replayedQuantity))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollRegion>
              <p className="mt-2 text-muted-foreground">
                {t("investments.import.warning.mismatchAdvice")}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
