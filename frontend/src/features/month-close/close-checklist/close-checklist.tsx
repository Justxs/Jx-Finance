import { type LinkOptions, linkOptions } from "@tanstack/react-router";
import { CircleCheck, CircleDashed } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MonthAccountCoverage, MonthChecklist } from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
import { Rows } from "@/components/ui/rows/rows";
import { TextLink } from "@/components/ui/text-link/text-link";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { useFeature } from "@/hooks/use-settings";
import { monthBounds, monthDate } from "@/lib/calendar";
import { INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";

export function openItemCount(checklist: MonthChecklist) {
  return (
    checklist.uncategorized +
    (checklist.unusual ?? 0) +
    checklist.duplicates +
    (checklist.unconfirmedRecurring ?? 0)
  );
}

function needsReconciling(entry: MonthAccountCoverage) {
  return entry.state === "differs" || entry.state === "behind";
}

export function attentionCount(checklist: MonthChecklist) {
  const counts = [
    checklist.uncategorized,
    checklist.unusual,
    checklist.duplicates,
    checklist.unconfirmedRecurring,
  ];
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

const otherCurrencyTexts = {
  reconciled: "monthClose.checklist.otherReconciled",
  differs: "monthClose.checklist.otherDiffers",
  imported: "monthClose.checklist.otherBehind",
  behind: "monthClose.checklist.otherBehind",
} as const;

export function openLineCount(checklist: MonthChecklist) {
  return openItemCount(checklist) + checklist.accounts.filter(needsReconciling).length;
}

type ChecklistKind = "uncategorized" | "unusual" | "duplicates" | "recurring" | "accounts";

const everyKind: readonly ChecklistKind[] = [
  "uncategorized",
  "unusual",
  "duplicates",
  "recurring",
  "accounts",
];

interface Action {
  label: string;
  link: LinkOptions;
  onClick?: () => void;
}

interface Item {
  key: string;
  kind: ChecklistKind;
  done: boolean;
  label: string;
  notes?: string[];
  actions: Action[];
}

interface Props {
  month: string;
  checklist: MonthChecklist;
  openOnly?: boolean;
  kinds?: readonly ChecklistKind[];
  onReconcile?: (accountId: string) => void;
  onImport?: (accountId: string) => void;
  className?: string;
}

function ActionControl({ action, first }: Readonly<{ action: Action; first: boolean }>) {
  const control = first ? { "data-line-control": "" } : {};
  if (action.onClick) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={action.onClick} {...control}>
        {action.label}
      </Button>
    );
  }
  return (
    <TextLink {...action.link} {...control}>
      {action.label}
    </TextLink>
  );
}

export function CloseChecklist({
  month,
  checklist,
  openOnly = false,
  kinds = everyKind,
  onReconcile,
  onImport,
  className,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const isoDate = useIsoDate();
  const money = useMoney();
  const importEnabled = useFeature("import");
  const range = monthBounds(monthDate(month));
  const review = t("monthClose.checklist.review");

  const items: Item[] = [
    {
      key: "uncategorized",
      kind: "uncategorized",
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
      kind: "unusual",
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

  items.push({
    key: "duplicates",
    kind: "duplicates",
    done: checklist.duplicates === 0,
    label:
      checklist.duplicates === 0
        ? t("monthClose.checklist.noDuplicates")
        : t("monthClose.checklist.duplicates", { count: checklist.duplicates }),
    actions: [
      {
        label: review,
        link: linkOptions({ to: "/transactions", search: { page: 1, ...range, duplicates: true } }),
      },
    ],
  });

  if (checklist.unconfirmedRecurring !== null) {
    items.push({
      key: "recurring",
      kind: "recurring",
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
    const actions: Action[] = [];
    if (entry.state === "behind" && importEnabled) {
      actions.push({
        label: t("monthClose.checklist.import"),
        link: linkOptions({ to: "/profile", search: { section: "import" } }),
        onClick: onImport && (() => onImport(entry.accountId)),
      });
    }
    actions.push({
      label: t("monthClose.checklist.reconcile"),
      link: linkOptions({ to: "/accounts", search: { reconcile: entry.accountId } }),
      onClick: onReconcile && (() => onReconcile(entry.accountId)),
    });
    items.push({
      key: `account-${entry.accountId}`,
      kind: "accounts",
      done: !needsReconciling(entry),
      label: t(entry.date ? accountTexts[entry.state] : "monthClose.checklist.noStatement", {
        account: entry.accountName,
        currency: entry.currency.toUpperCase(),
        date: entry.date ? isoDate(entry.date) : "",
        difference: money.format(Math.abs(Number(entry.difference ?? 0)), entry.currency),
      }),
      notes: entry.otherCurrencies.map((other) =>
        t(otherCurrencyTexts[other.state], {
          currency: other.currency.toUpperCase(),
          date: isoDate(other.date),
          difference: money.format(Math.abs(Number(other.difference ?? 0)), other.currency),
        }),
      ),
      actions,
    });
  }

  const shown = items.filter((item) => kinds.includes(item.kind) && (!openOnly || !item.done));

  return (
    <Rows className={className}>
      {shown.map((item) => {
        const Icon = item.done ? CircleCheck : CircleDashed;
        return (
          <li
            key={item.key}
            tabIndex={item.done ? undefined : -1}
            data-open-line={item.done ? undefined : ""}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm focus-ring"
          >
            <span className="flex min-w-0 items-start gap-2.5">
              <Icon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  item.done ? INCOME_TONE : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "min-w-0 wrap-break-word tabular-nums",
                  item.done ? "text-muted-foreground" : "font-medium",
                )}
              >
                {item.label}
                {item.notes?.map((note) => (
                  <span key={note} className="block text-xs font-normal text-muted-foreground">
                    {note}
                  </span>
                ))}
              </span>
            </span>
            {item.done ? null : (
              <span
                className={cn(
                  "ml-auto flex items-center gap-y-2",
                  item.actions.some((action) => action.onClick) ? "gap-x-2" : "gap-x-4",
                )}
              >
                {item.actions.map((action, index) => (
                  <ActionControl key={action.label} action={action} first={index === 0} />
                ))}
              </span>
            )}
          </li>
        );
      })}
    </Rows>
  );
}
