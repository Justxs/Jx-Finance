import {
  getNotificationsMockHandler,
  getMarkAllNotificationsReadMockHandler,
  getMarkNotificationReadMockHandler,
} from "@/api/generated/notifications/notifications.msw";
import { notifications } from "@/storybook/fixtures";

export const notificationHandlers = [
  getNotificationsMockHandler(({ request }) => {
    const unread = new URL(request.url).searchParams.get("unread") === "true";
    return unread ? notifications.filter((item) => !item.isRead) : notifications;
  }),
  getMarkAllNotificationsReadMockHandler(),
  getMarkNotificationReadMockHandler(),
];
