import { type LinkOptions, linkOptions } from "@tanstack/react-router";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MonthAccountCoverage, MonthChecklist } from "@/api/generated/model";
import { Rows } from "@/components/ui/rows/rows";
import { TextLink } from "@/components/ui/text-link/text-link";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { useFeature } from "@/hooks/use-settings";
import { monthBounds, monthDate } from "@/lib/calendar";
import { EXPENSE_TONE, INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";

export function openItemCount(checklist: MonthChecklist) {
  return checklist.uncategorized + (checklist.unusual ?? 0) + (checklist.unconfirmedRecurring ?? 0);
}

function needsReconciling(entry: MonthAccountCoverage) {
  return entry.state === "differs" || entry.state === "behind";
}

export function attentionCount(checklist: MonthChecklist) {
  const counts = [checklist.uncategorized, checklist.unusual, checklist.unconfirmedRecurring];
  return (
    counts.filter((count) => (count ?? 0) > 0).length +
    checklist.accounts.filter(needsReconciling).length
  );
}

const accountTexts = {
  reconciled: "monthClose.checklist.reconciled",
  differs: "monthClose.checklist.differs",
  imported: "monthClose.checklist.importCovered",
  behind: "monthClose.checklist.behind",
} as const;

interface Item {
  key: string;
  done: boolean;
  label: string;
  actions: { label: string; link: LinkOptions }[];
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
  const money = useMoney();
  const importEnabled = useFeature("import");
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
      actions: [
        {
          label: t("monthClose.checklist.categorize"),
          link: linkOptions({
            to: "/transactions",
            search: { page: 1, ...range, uncategorized: true },
          }),
        },
      ],
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
      actions: [
        {
          label: review,
          link: linkOptions({ to: "/transactions", search: { page: 1, ...range, unusual: true } }),
        },
      ],
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
      actions: [
        { label: t("monthClose.checklist.confirm"), link: linkOptions({ to: "/recurring-bills" }) },
      ],
    });
  }

  for (const entry of checklist.accounts) {
    const actions: Item["actions"] = [
      {
        label: t("monthClose.checklist.reconcile"),
        link: linkOptions({ to: "/accounts", search: { reconcile: entry.accountId } }),
      },
    ];
    if (entry.state === "behind" && importEnabled) {
      actions.push({
        label: t("monthClose.checklist.import"),
        link: linkOptions({ to: "/profile", search: { section: "import" } }),
      });
    }
    items.push({
      key: `account-${entry.accountId}`,
      done: !needsReconciling(entry),
      label: t(accountTexts[entry.state], {
        account: entry.accountName,
        date: entry.date ? isoDate(entry.date) : "",
        difference: money.format(Math.abs(Number(entry.difference ?? 0)), entry.currency),
      }),
      actions,
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
              <span className="ml-auto flex gap-x-4">
                {item.actions.map((action) => (
                  <TextLink key={action.label} {...action.link}>
                    {action.label}
                  </TextLink>
                ))}
              </span>
            )}
          </li>
        );
      })}
    </Rows>
  );
}
