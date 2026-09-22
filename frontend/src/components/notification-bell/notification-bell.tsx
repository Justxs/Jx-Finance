import { Link } from "@tanstack/react-router";
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
  NotificationResponse,
  NotificationType,
  NotificationsParams,
} from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover/popover";
import { Rows } from "@/components/ui/rows/rows";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useDate } from "@/hooks/use-formatters";
import { type FeatureKey, useSettings } from "@/hooks/use-settings";
import { parseIso } from "@/lib/calendar";
import { optimisticRemoval, optimisticUpdate } from "@/lib/optimistic";
import { cn } from "@/lib/utils";

export function NotificationBellUnavailable() {
  const { t } = useTranslation();

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

export const unreadParams: NotificationsParams = { unread: true };

const producers = {
  billDue: { feature: "recurringBills", to: "/recurring-bills" },
  budgetWarning: { feature: "budgets", to: "/budgets" },
  budgetExceeded: { feature: "budgets", to: "/budgets" },
} as const satisfies Record<NotificationType, { feature: FeatureKey; to: string }>;

const entryClassName = "block w-full px-4 py-3 text-left text-sm hover:bg-accent";

function noNotifications(): NotificationResponse[] {
  return [];
}

interface Props {
  placement?: "below" | "above";
}

export function NotificationBell({ placement = "below" }: Readonly<Props>) {
  const { t } = useTranslation();
  const date = useDate();
  const features = useSettings().features;
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

  function describe(notification: NotificationResponse) {
    const { dueDate, thresholdPercent, period, shape } = notification.payload;

    if (notification.type === "billDue") {
      const due = dueDate ? parseIso(dueDate) : null;
      return due
        ? t(`notifications.billDue.${shape ?? "expense"}`, { date: date.format(due) })
        : notification.message;
    }

    if (!period) {
      return notification.message;
    }

    const periodName = t(`budgets.periods.${period}`);
    return notification.type === "budgetExceeded"
      ? t("notifications.budgetExceeded", { period: periodName })
      : t("notifications.budgetWarning", { period: periodName, percent: thresholdPercent ?? 80 });
  }

  function destination(notification: NotificationResponse) {
    const producer = producers[notification.type];
    return features[producer.feature] ? producer.to : null;
  }

  function entryState(notification: NotificationResponse) {
    return cn(
      entryClassName,
      markReadMutation.isPending && markReadMutation.variables?.id === notification.id && "stale",
    );
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

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button type="button" variant="ghost" size="icon" aria-label={bellLabel}>
              <Bell />
            </Button>
          }
        />
        <PopoverContent
          side={placement === "below" ? "bottom" : "top"}
          align={placement === "below" ? "end" : "start"}
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
                variant="ghost"
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
                  const to = destination(notification);

                  return (
                    <li key={notification.id}>
                      {to ? (
                        <Link
                          to={to}
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
      {unreadList.length > 0 ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-2xs font-semibold text-destructive-foreground"
        >
          {unreadList.length > 9 ? "9+" : unreadList.length}
        </span>
      ) : null}
    </div>
  );
}
