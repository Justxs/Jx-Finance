import { type LinkOptions, linkOptions } from "@tanstack/react-router";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MonthChecklist } from "@/api/generated/model";
import { Rows } from "@/components/ui/rows/rows";
import { TextLink } from "@/components/ui/text-link/text-link";
import { useIsoDate } from "@/hooks/use-formatters";
import { monthBounds } from "@/lib/calendar";
import { EXPENSE_TONE, INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { monthDate } from "../month-key";

export function openItemCount(checklist: MonthChecklist) {
  return checklist.uncategorized + (checklist.unusual ?? 0) + (checklist.unconfirmedRecurring ?? 0);
}

function importsBehind(checklist: MonthChecklist, monthEnd: string) {
  return (checklist.imports ?? []).filter((entry) => entry.latestImportedDate < monthEnd);
}

export function attentionCount(checklist: MonthChecklist, monthEnd: string) {
  const counts = [checklist.uncategorized, checklist.unusual, checklist.unconfirmedRecurring];
  return (
    counts.filter((count) => (count ?? 0) > 0).length + importsBehind(checklist, monthEnd).length
  );
}

interface Item {
  key: string;
  done: boolean;
  label: string;
  action: string;
  link: LinkOptions;
}

interface Props {
  month: string;
  checklist: MonthChecklist;
  openOnly?: boolean;
  className?: string;
}

export function CloseChecklist({ month, checklist, openOnly = false, className }: Readonly<Props>) {
  const { t } = useTranslation();
  const isoDate = useIsoDate();
  const range = monthBounds(monthDate(month));
  const review = t("monthClose.checklist.review");

  const items: Item[] = [
    {
      key: "uncategorized",
      done: checklist.uncategorized === 0,
      label:
        checklist.uncategorized === 0
          ? t("monthClose.checklist.noUncategorized")
          : t("monthClose.checklist.uncategorized", { count: checklist.uncategorized }),
      action: t("monthClose.checklist.categorize"),
      link: linkOptions({
        to: "/transactions",
        search: { page: 1, ...range, uncategorized: true },
      }),
    },
  ];

  if (checklist.unusual !== null) {
    items.push({
      key: "unusual",
      done: checklist.unusual === 0,
      label:
        checklist.unusual === 0
          ? t("monthClose.checklist.noUnusual")
          : t("monthClose.checklist.unusual", { count: checklist.unusual }),
      action: review,
      link: linkOptions({ to: "/transactions", search: { page: 1, ...range, unusual: true } }),
    });
  }

  if (checklist.unconfirmedRecurring !== null) {
    items.push({
      key: "recurring",
      done: checklist.unconfirmedRecurring === 0,
      label:
        checklist.unconfirmedRecurring === 0
          ? t("monthClose.checklist.noRecurring")
          : t("monthClose.checklist.recurring", { count: checklist.unconfirmedRecurring }),
      action: t("monthClose.checklist.confirm"),
      link: linkOptions({ to: "/recurring-bills" }),
    });
  }

  for (const entry of checklist.imports ?? []) {
    const behind = entry.latestImportedDate < range.dateTo;
    items.push({
      key: `import-${entry.accountId}`,
      done: !behind,
      label: t(
        behind ? "monthClose.checklist.importBehind" : "monthClose.checklist.importCovered",
        {
          account: entry.accountName,
          date: isoDate(entry.latestImportedDate),
        },
      ),
      action: t("monthClose.checklist.import"),
      link: linkOptions({ to: "/profile", search: { section: "import" } }),
    });
  }

  const shown = openOnly ? items.filter((item) => !item.done) : items;

  return (
    <Rows className={className}>
      {shown.map((item) => {
        const Icon = item.done ? CircleCheck : CircleAlert;
        return (
          <li
            key={item.key}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm"
          >
            <span className="flex min-w-0 items-start gap-2.5">
              <Icon
                aria-hidden="true"
                className={cn("mt-0.5 size-4 shrink-0", item.done ? INCOME_TONE : EXPENSE_TONE)}
              />
              <span
                className={cn(
                  "min-w-0 wrap-break-word tabular-nums",
                  item.done ? "text-muted-foreground" : "font-medium",
                )}
              >
                {item.label}
              </span>
            </span>
            {item.done ? null : (
              <TextLink {...item.link} className="ml-auto">
                {item.action}
              </TextLink>
            )}
          </li>
        );
      })}
    </Rows>
  );
}
