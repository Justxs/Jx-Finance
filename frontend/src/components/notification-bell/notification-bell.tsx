import { useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getNotificationsQueryKey,
  useNotificationsSuspense,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/api/generated";
import type { NotificationResponse, NotificationsParams } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { useDate } from "@/hooks/use-formatters";
import { parseIso } from "@/lib/calendar";
import { optimisticRemoval, optimisticUpdate } from "@/lib/optimistic";

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

function noNotifications(): NotificationResponse[] {
  return [];
}

interface Props {
  placement?: "below" | "above";
}

export function NotificationBell({ placement = "below" }: Readonly<Props>) {
  const { t } = useTranslation();
  const date = useDate();
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const unreadKey = getNotificationsQueryKey(unreadParams);
  const notifications = useNotificationsSuspense(unreadParams);
  const unreadList = notifications.data;

  const bellLabel =
    unreadList.length > 0
      ? t("notifications.titleWithCount", { count: unreadList.length })
      : t("notifications.title");

  const markReadMutation = useMarkNotificationRead({
    mutation: optimisticRemoval<NotificationResponse>(queryClient, unreadKey),
  });
  const markAllReadMutation = useMarkAllNotificationsRead({
    mutation: optimisticUpdate<NotificationResponse[]>({
      queryClient,
      queryKey: unreadKey,
      apply: noNotifications,
    }),
  });

  function describe(notification: NotificationResponse) {
    const dueDate = notification.type === "billDue" ? parseIso(notification.message ?? "") : null;
    return dueDate
      ? t("notifications.billDue", { date: date.format(dueDate) })
      : notification.message;
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={bellLabel}
              tooltip={bellLabel}
            >
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
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                {t("notifications.empty")}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {unreadList.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-accent ${
                        markReadMutation.isPending &&
                        markReadMutation.variables?.id === notification.id
                          ? "is-stale"
                          : ""
                      }`}
                      disabled={markReadMutation.isPending}
                      onClick={() => markReadMutation.mutate({ id: notification.id })}
                    >
                      <p className="font-medium">{notification.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {describe(notification)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {unreadList.length > 0 ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground"
        >
          {unreadList.length > 9 ? "9+" : unreadList.length}
        </span>
      ) : null}
    </div>
  );
}
