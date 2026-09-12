import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useId, useState, type FocusEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetNotificationsEndpointQueryKey,
  useGetNotificationsEndpointSuspense,
  useMarkAllNotificationsReadEndpoint,
  useMarkNotificationReadEndpoint,
} from "@/api/generated";
import { Button } from "@/components/ui/button";
import { useDate } from "@/hooks/use-formatters";

export function NotificationBell() {
  const { t } = useTranslation();
  const date = useDate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const notifications = useGetNotificationsEndpointSuspense({ unread: true });
  const unreadList = notifications.data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetNotificationsEndpointQueryKey() });
  }

  const markReadMutation = useMarkNotificationReadEndpoint({ mutation: { onSettled: invalidate } });
  const markAllReadMutation = useMarkAllNotificationsReadEndpoint({
    mutation: { onSettled: invalidate },
  });

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
    }
  }

  return (
    <div
      className="relative"
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("notifications.title")}
        title={t("notifications.title")}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <Bell />
      </Button>
      {unreadList.length > 0 ? (
        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
          {unreadList.length > 9 ? "9+" : unreadList.length}
        </span>
      ) : null}

      {open ? (
        <div
          id={panelId}
          className="fixed inset-x-4 top-16 z-50 rounded-md border bg-card shadow-md sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
            <span className="text-sm font-semibold">{t("notifications.title")}</span>
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
                        markReadMutation.variables?.id === notification.id ? "is-stale" : ""
                      }`}
                      disabled={markReadMutation.isPending}
                      onClick={() => markReadMutation.mutate({ id: notification.id! })}
                    >
                      <p className="font-medium">{notification.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {notification.type === "billDue" &&
                        /^\d{4}-\d{2}-\d{2}$/.test(notification.message ?? "")
                          ? t("notifications.billDue", {
                              date: date.format(new Date(`${notification.message}T12:00:00`)),
                            })
                          : notification.message}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
