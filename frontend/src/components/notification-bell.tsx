import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useState, type FocusEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetNotificationsEndpointQueryKey,
  useGetNotificationsEndpoint,
  useMarkAllNotificationsReadEndpoint,
  useMarkNotificationReadEndpoint,
} from "@/api/generated";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const notifications = useGetNotificationsEndpoint({ unread: true });
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
    <div className="relative" onBlur={handleBlur}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("notifications.title")}
        title={t("notifications.title")}
      >
        <Bell />
      </Button>
      {unreadList.length > 0 ? (
        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
          {unreadList.length > 9 ? "9+" : unreadList.length}
        </span>
      ) : null}

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border bg-card shadow-md">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">{t("notifications.title")}</span>
            {unreadList.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={markAllReadMutation.isPending}
                onClick={() => markAllReadMutation.mutate()}
              >
                {t("notifications.markAllRead")}
              </Button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
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
                      className="w-full px-4 py-3 text-left text-sm hover:bg-accent"
                      disabled={markReadMutation.isPending}
                      onClick={() => markReadMutation.mutate({ id: notification.id! })}
                    >
                      <p className="font-medium">{notification.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{notification.message}</p>
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
