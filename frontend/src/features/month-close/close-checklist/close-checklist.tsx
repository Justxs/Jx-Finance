import { linkOptions } from "@tanstack/react-router";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MonthChecklist } from "@/api/generated/model";
import { Rows } from "@/components/ui/rows/rows";
import { TitledSection } from "@/components/ui/section/section";
import { TextLink } from "@/components/ui/text-link/text-link";
import { useIsoDate } from "@/hooks/use-formatters";
import { monthBounds } from "@/lib/calendar";
import { EXPENSE_TONE, INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { monthDate } from "../month-key";

export function openItemCount(checklist: MonthChecklist) {
  return checklist.uncategorized + (checklist.unusual ?? 0) + (checklist.unconfirmedRecurring ?? 0);
}

interface Props {
  month: string;
  checklist: MonthChecklist;
}

export function CloseChecklist({ month, checklist }: Readonly<Props>) {
  const { t } = useTranslation();
  const isoDate = useIsoDate();
  const range = monthBounds(monthDate(month));

  const items = [
    {
      count: checklist.uncategorized,
      label:
        checklist.uncategorized === 0
          ? t("monthClose.checklist.noUncategorized")
          : t("monthClose.checklist.uncategorized", { count: checklist.uncategorized }),
      link: linkOptions({
        to: "/transactions",
        search: { page: 1, ...range, uncategorized: true },
      }),
    },
    checklist.unusual === null
      ? null
      : {
          count: checklist.unusual,
          label:
            checklist.unusual === 0
              ? t("monthClose.checklist.noUnusual")
              : t("monthClose.checklist.unusual", { count: checklist.unusual }),
          link: linkOptions({ to: "/transactions", search: { page: 1, ...range, unusual: true } }),
        },
    checklist.unconfirmedRecurring === null
      ? null
      : {
          count: checklist.unconfirmedRecurring,
          label:
            checklist.unconfirmedRecurring === 0
              ? t("monthClose.checklist.noRecurring")
              : t("monthClose.checklist.recurring", { count: checklist.unconfirmedRecurring }),
          link: linkOptions({ to: "/recurring-bills" }),
        },
  ].filter((item) => item !== null);

  return (
    <TitledSection title={t("monthClose.checklist.title")}>
      <Rows className="mt-2">
        {items.map(({ count, label, link }) => {
          const Icon = count === 0 ? CircleCheck : CircleAlert;
          return (
            <li
              key={label}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm"
            >
              <span className="flex min-w-0 items-start gap-2">
                <Icon
                  aria-hidden="true"
                  className={cn("mt-0.5 size-4 shrink-0", count === 0 ? INCOME_TONE : EXPENSE_TONE)}
                />
                <span
                  className={cn("min-w-0 wrap-break-word", count === 0 && "text-muted-foreground")}
                >
                  {label}
                </span>
              </span>
              {count === 0 ? null : (
                <TextLink {...link}>{t("monthClose.checklist.review")}</TextLink>
              )}
            </li>
          );
        })}
      </Rows>

      {checklist.imports && checklist.imports.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-medium">{t("monthClose.checklist.imports")}</h3>
          <ul className="mt-1.5 space-y-1">
            {checklist.imports.map((entry) => {
              const behind = entry.latestImportedDate < range.dateTo;
              return (
                <li
                  key={entry.accountId}
                  className={cn(
                    "text-sm wrap-break-word tabular-nums",
                    behind ? EXPENSE_TONE : "text-muted-foreground",
                  )}
                >
                  {t(
                    behind
                      ? "monthClose.checklist.importBehind"
                      : "monthClose.checklist.importCovered",
                    {
                      account: entry.accountName,
                      date: isoDate(entry.latestImportedDate),
                    },
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </TitledSection>
  );
}
