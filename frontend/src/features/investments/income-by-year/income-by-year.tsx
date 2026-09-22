import { useTranslation } from "react-i18next";
import type { Currency, PortfolioYear } from "@/api/generated/model";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionTitle } from "@/components/ui/section/section";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { useMoney } from "@/hooks/use-formatters";
import { gainTone } from "@/lib/tone";
import { cn } from "@/lib/utils";

interface Props {
  years: readonly PortfolioYear[];
  currency: Currency;
}

export function IncomeByYear({ years, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const rows = years.toSorted((left, right) => right.year - left.year);

  function charge(value: string) {
    const amount = Number(value);
    return amount > 0 ? money.formatSigned(amount, "−", currency) : money.format(amount, currency);
  }

  return (
    <Section>
      <SectionTitle className="mb-2">{t("investments.years.title")}</SectionTitle>
      {rows.length === 0 ? (
        <EmptyText>{t("investments.years.empty")}</EmptyText>
      ) : (
        <>
          <div className="-mx-3 hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("investments.years.year")}</TableHead>
                  <TableHead className="text-right">{t("investments.years.dividends")}</TableHead>
                  <TableHead className="text-right">
                    {t("investments.years.withholdingTax")}
                  </TableHead>
                  <TableHead className="text-right">{t("investments.years.interest")}</TableHead>
                  <TableHead className="text-right">{t("investments.years.fees")}</TableHead>
                  <TableHead className="text-right">
                    {t("investments.years.realizedGain")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell className="font-medium tabular-nums">{row.year}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money.format(Number(row.dividends), currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {charge(row.withholdingTax)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money.format(Number(row.interest), currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{charge(row.fees)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      <span className={gainTone(Number(row.realizedGain))}>
                        {money.formatSigned(Number(row.realizedGain), "auto", currency)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Rows className="sm:hidden">
            {rows.map((row) => (
              <li key={row.year} className="py-2.5 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold tabular-nums">{row.year}</h3>
                  <p
                    className={cn(
                      "font-semibold whitespace-nowrap tabular-nums",
                      gainTone(Number(row.realizedGain)),
                    )}
                  >
                    <span className="sr-only">{t("investments.years.realizedGain")}: </span>
                    {money.formatSigned(Number(row.realizedGain), "auto", currency)}
                  </p>
                </div>
                <dl className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
                  {(
                    [
                      ["dividends", money.format(Number(row.dividends), currency)],
                      ["withholdingTax", charge(row.withholdingTax)],
                      ["interest", money.format(Number(row.interest), currency)],
                      ["fees", charge(row.fees)],
                    ] as const
                  ).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{t(`investments.years.${key}`)}</dt>
                      <dd className="whitespace-nowrap tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </Rows>
        </>
      )}
    </Section>
  );
}
