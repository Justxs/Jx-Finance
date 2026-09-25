import {
  getNotificationsMockHandler,
  getMarkAllNotificationsReadMockHandler,
  getMarkNotificationReadMockHandler,
} from "@/api/generated/notifications/notifications.msw";
import { notifications } from "@/storybook/fixtures";
import { query } from "./http";

export const notificationHandlers = [
  getNotificationsMockHandler(({ request }) => {
    const unread = query(request).get("unread") === "true";
    return unread ? notifications.filter((item) => !item.isRead) : notifications;
  }),
  getMarkAllNotificationsReadMockHandler(),
  getMarkNotificationReadMockHandler(),
];
