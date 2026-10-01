import { Link, linkOptions } from "@tanstack/react-router";
import { Bell, BellOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getNotificationsQueryKey,
  useNotificationsSuspense,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/api/generated";
import type {
  NotificationPayload,
  NotificationResponse,
  NotificationType,
} from "@/api/generated/model";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover/popover";
import { Rows } from "@/components/ui/rows/rows";
import { IconButtonSkeleton, Skeleton } from "@/components/ui/skeleton/skeleton";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useDate, useMoney, useMonthName, useNumberFormat } from "@/hooks/use-formatters";
import { useSettings } from "@/hooks/use-settings";
import { unreadParams } from "@/lib/app-shell";
import { monthKeyOfIso, parseIso } from "@/lib/calendar";
import { maskDigits } from "@/lib/mask-amount";
import { pendingId } from "@/lib/mutations";
import { sidebarRowClass } from "@/lib/navigation";
import { optimisticRemoval, optimisticUpdate } from "@/lib/optimistic";
import type { FeatureKey } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { useAmountsHidden } from "@/stores/privacy-store";

type SidebarState = "expanded" | "collapsed";

interface Props {
  sidebar?: SidebarState;
}

function sidebarTriggerClass(sidebar: SidebarState) {
  return cn(
    sidebarRowClass,
    "w-full disabled:opacity-50 aria-expanded:bg-accent aria-expanded:text-foreground",
    sidebar === "collapsed" && "justify-center px-0",
  );
}

function NotificationBellUnavailable({ sidebar }: Readonly<Props>) {
  const { t } = useTranslation();

  if (sidebar) {
    return (
      <button
        type="button"
        disabled
        aria-label={t("notifications.unavailable")}
        className={sidebarTriggerClass(sidebar)}
      >
        <BellOff className="size-4 shrink-0" />
        {sidebar === "expanded" ? t("notifications.title") : null}
      </button>
    );
  }

  return (
    <Tooltip content={t("notifications.unavailable")}>
      <span className="inline-flex">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled
          aria-label={t("notifications.unavailable")}
        >
          <BellOff />
        </Button>
      </span>
    </Tooltip>
  );
}

const bills = linkOptions({ to: "/recurring-bills" });
const budgets = linkOptions({ to: "/budgets" });
const unusual = linkOptions({ to: "/transactions", search: { unusual: true } });
const accounts = linkOptions({ to: "/accounts" });
const ledger = linkOptions({ to: "/transactions" });
const importSection = linkOptions({ to: "/profile", search: { section: "import" } });

function monthLink({ month }: NotificationPayload) {
  return linkOptions({ to: "/", search: { month: month ? monthKeyOfIso(month) : undefined } });
}

const producers = {
  billDue: { feature: "recurringBills", link: () => bills },
  budgetWarning: { feature: "budgets", link: () => budgets },
  budgetExceeded: { feature: "budgets", link: () => budgets },
  unusualAmount: { feature: "unusualAmounts", link: () => unusual },
  unusualAmounts: { feature: "unusualAmounts", link: () => unusual },
  recurringPriceRise: { feature: "recurringBills", link: () => bills },
  monthReadyToClose: { feature: "monthClose", link: monthLink },
  monthlyDigest: { feature: "monthClose", link: monthLink },
  lowBalance: { feature: "recurringBills", link: () => accounts },
  warrantyExpiring: { feature: undefined, link: () => ledger },
  importWaiting: { feature: "import", link: () => importSection },
} as const satisfies Record<
  NotificationType,
  { feature: FeatureKey | undefined; link: (payload: NotificationPayload) => unknown }
>;

const entryClassName = "block w-full px-4 py-3 text-left text-sm hover:bg-accent";

function noNotifications(): NotificationResponse[] {
  return [];
}

function popoverPosition(sidebar: SidebarState | undefined) {
  if (sidebar === "collapsed") {
    return { side: "right", align: "end" } as const;
  }
  return sidebar
    ? ({ side: "top", align: "start" } as const)
    : ({ side: "bottom", align: "end" } as const);
}

export function NotificationBell({ sidebar }: Readonly<Props>) {
  const { t } = useTranslation();
  const date = useDate();
  const money = useMoney();
  const factorFormat = useNumberFormat({ maximumFractionDigits: 1 });
  const monthName = useMonthName();
  const features = useSettings().features;
  const amountsHidden = useAmountsHidden();
  const [open, setOpen] = useState(false);

  const unreadKey = getNotificationsQueryKey(unreadParams);
  const notifications = useNotificationsSuspense(unreadParams);
  const unreadList = notifications.data;

  const bellLabel =
    unreadList.length > 0
      ? t("notifications.titleWithCount", { count: unreadList.length })
      : t("notifications.title");

  const markReadMutation = useMarkNotificationRead({
    mutation: optimisticRemoval<NotificationResponse>(unreadKey),
  });
  const markAllReadMutation = useMarkAllNotificationsRead({
    mutation: optimisticUpdate<NotificationResponse[]>({
      queryKey: unreadKey,
      apply: noNotifications,
    }),
  });

  function serverMessage(notification: NotificationResponse) {
    return amountsHidden ? maskDigits(notification.message) : notification.message;
  }

  function describeBudget(notification: NotificationResponse) {
    const { thresholdPercent, period } = notification.payload;
    if (!period) {
      return serverMessage(notification);
    }

    const periodName = t(`budgets.periods.${period}`);
    return notification.type === "budgetExceeded"
      ? t("notifications.budgetExceeded", { period: periodName })
      : t("notifications.budgetWarning", { period: periodName, percent: thresholdPercent ?? 80 });
  }

  function describe(notification: NotificationResponse) {
    const { dueDate, shape, amount, typicalAmount, factor, count, currency, month, digest } =
      notification.payload;
    const inCurrency = currency ?? undefined;

    switch (notification.type) {
      case "billDue": {
        const due = dueDate ? parseIso(dueDate) : null;
        return due
          ? t(`notifications.billDue.${shape ?? "expense"}`, { date: date.format(due) })
          : serverMessage(notification);
      }
      case "unusualAmount":
        return amount && typicalAmount && factor
          ? t("notifications.unusualAmount", {
              amount: money.format(Number(amount), inCurrency),
              typical: money.format(Number(typicalAmount), inCurrency),
              factor: factorFormat.format(factor),
            })
          : serverMessage(notification);
      case "unusualAmounts":
        return count ? t("notifications.unusualAmounts", { count }) : serverMessage(notification);
      case "recurringPriceRise":
        return amount && typicalAmount
          ? t("notifications.recurringPriceRise", {
              amount: money.format(Number(amount), inCurrency),
              expected: money.format(Number(typicalAmount), inCurrency),
            })
          : serverMessage(notification);
      case "monthReadyToClose":
        return month
          ? t("notifications.monthReadyToClose", { month: monthName(month) })
          : serverMessage(notification);
      case "warrantyExpiring": {
        const warrantyUntil = dueDate ? parseIso(dueDate) : null;
        return warrantyUntil
          ? t("notifications.warrantyExpiring", { date: date.format(warrantyUntil) })
          : serverMessage(notification);
      }
      case "importWaiting":
        return t("notifications.importWaiting");
      case "lowBalance": {
        const belowZeroOn = dueDate ? parseIso(dueDate) : null;
        return belowZeroOn && amount
          ? t("notifications.lowBalance", {
              date: date.format(belowZeroOn),
              amount: money.format(Number(amount), inCurrency),
            })
          : serverMessage(notification);
      }
      case "monthlyDigest":
        return digest
          ? t("notifications.monthlyDigest", {
              income: money.format(Number(digest.income), digest.currency),
              expense: money.format(Number(digest.expense), digest.currency),
              net: money.format(Number(digest.net), digest.currency),
            })
          : serverMessage(notification);
      default:
        return describeBudget(notification);
    }
  }

  function entryState(notification: NotificationResponse) {
    return cn(entryClassName, pendingId(markReadMutation) === notification.id && "stale");
  }

  function body(notification: NotificationResponse) {
    return (
      <>
        <p className="font-medium">{notification.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{describe(notification)}</p>
      </>
    );
  }

  function markRead(notification: NotificationResponse) {
    markReadMutation.mutate({ id: notification.id });
  }

  const unreadCount = unreadList.length > 9 ? "9+" : unreadList.length;

  const trigger = sidebar ? (
    <button type="button" aria-label={bellLabel} className={sidebarTriggerClass(sidebar)}>
      <Bell className="size-4 shrink-0" />
      {sidebar === "expanded" ? (
        <>
          <span className="flex-1 text-left">{t("notifications.title")}</span>
          {unreadList.length > 0 ? (
            <span
              aria-hidden="true"
              className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-2xs font-semibold text-destructive-foreground"
            >
              {unreadCount}
            </span>
          ) : null}
        </>
      ) : null}
    </button>
  ) : (
    <Button type="button" variant="ghost" size="icon" aria-label={bellLabel}>
      <Bell />
    </Button>
  );

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip content={sidebar === "collapsed" ? bellLabel : undefined} side="right">
          <PopoverTrigger render={trigger} />
        </Tooltip>
        <PopoverContent
          {...popoverPosition(sidebar)}
          sideOffset={8}
          className="w-[min(20rem,calc(100vw-2rem))] gap-0 p-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
            <PopoverTitle className="text-sm font-semibold">
              {t("notifications.title")}
            </PopoverTitle>
            {unreadList.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                pending={markAllReadMutation.isPending}
                onClick={() => markAllReadMutation.mutate()}
              >
                {t("notifications.markAllRead")}
              </Button>
            ) : null}
          </div>
          <div className="max-h-[min(24rem,calc(100dvh-9rem))] overflow-y-auto overscroll-contain wrap-break-word">
            {unreadList.length === 0 ? (
              <div className="px-4 text-center">
                <EmptyText>{t("notifications.empty")}</EmptyText>
              </div>
            ) : (
              <Rows>
                {unreadList.map((notification) => {
                  const producer = producers[notification.type];
                  const link =
                    producer.feature === undefined || features[producer.feature]
                      ? producer.link(notification.payload)
                      : null;

                  return (
                    <li key={notification.id}>
                      {link ? (
                        <Link
                          {...link}
                          className={entryState(notification)}
                          onClick={() => {
                            setOpen(false);
                            markRead(notification);
                          }}
                        >
                          {body(notification)}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={entryState(notification)}
                          disabled={markReadMutation.isPending}
                          onClick={() => markRead(notification)}
                        >
                          {body(notification)}
                        </button>
                      )}
                    </li>
                  );
                })}
              </Rows>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {unreadList.length > 0 && sidebar !== "expanded" ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute flex size-4 items-center justify-center rounded-full bg-destructive text-2xs font-semibold text-destructive-foreground",
            sidebar === "collapsed" ? "top-0 right-2" : "-top-1 -right-1",
          )}
        >
          {unreadCount}
        </span>
      ) : null}
    </div>
  );
}

export function NotificationBellSlot(props: Readonly<Props>) {
  return (
    <QueryBoundary
      fallback={
        props.sidebar ? (
          <Skeleton className="h-9 w-full rounded-md" />
        ) : (
          <IconButtonSkeleton size="md" />
        )
      }
      error={<NotificationBellUnavailable {...props} />}
    >
      <NotificationBell {...props} />
    </QueryBoundary>
  );
}
