import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import type { NotificationResponse } from "@/api/generated/model";
import { getNotificationsMockHandler } from "@/api/generated/notifications/notifications.msw";
import {
  budgetExceededNotification,
  budgetWarningNotification,
  expenseDueNotification,
  incomeDueNotification,
  notifications,
  transferDueNotification,
} from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { query } from "@/storybook/handlers/http";
import { QueryBoundary } from "../query-boundary/query-boundary";
import { Skeleton } from "../ui/skeleton/skeleton";
import { NotificationBell } from "./notification-bell";

function notificationsHandler(items: NotificationResponse[]) {
  return getNotificationsMockHandler(({ request }) => {
    const unreadOnly = query(request).get("unread") === "true";
    return unreadOnly ? items.filter((item) => !item.isRead) : items;
  });
}

const allRead: NotificationResponse[] = notifications.map((item) => ({ ...item, isRead: true }));

const budgetAlerts: NotificationResponse[] = [
  budgetExceededNotification,
  budgetWarningNotification,
];

const recurringReminders: NotificationResponse[] = [
  expenseDueNotification,
  incomeDueNotification,
  transferDueNotification,
];

function manyUnreadTitle(index: number) {
  return index === 0
    ? "A recurring bill with a very long name that should wrap inside the notification panel"
    : `Bill ${index + 1}`;
}

const manyUnread: NotificationResponse[] = Array.from({ length: 14 }, (_, index) => ({
  id: `story-notification-${index}`,
  type: "billDue",
  title: manyUnreadTitle(index),
  message: index === 1 ? "A plain text message instead of a due date." : "2026-09-20",
  payload: index === 1 ? {} : { dueDate: "2026-09-20" },
  relatedType: null,
  relatedId: null,
  channel: "inApp",
  isRead: false,
  createdAt: "2026-09-17T06:00:00Z",
}));

const meta = {
  title: "Components/NotificationBell",
  component: NotificationBell,
  decorators: [
    (Story) => (
      <div className="flex h-96 w-[min(90vw,24rem)] items-start justify-end">
        <QueryBoundary fallback={<Skeleton className="size-9" />} errorClassName="p-0">
          <Story />
        </QueryBoundary>
      </div>
    ),
  ],
} satisfies Meta<typeof NotificationBell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllRead: Story = {
  parameters: withHandlers(notificationsHandler(allRead)),
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const ManyUnread: Story = {
  parameters: withHandlers(notificationsHandler(manyUnread)),
};

export const BudgetAlerts: Story = {
  parameters: withHandlers(notificationsHandler(budgetAlerts)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /2 unread/i }));

    const panel = within(await within(document.body).findByRole("dialog"));
    const alerts = await panel.findAllByRole("link");

    await expect(alerts).toHaveLength(2);
    await expect(alerts[0]).toHaveAttribute("href", "/budgets");
    await expect(alerts[0]).toHaveTextContent("Weekly limit reached");
    await expect(alerts[1]).toHaveTextContent("Monthly limit: 80% used");
  },
};

export const RecurringEntryReminders: Story = {
  parameters: withHandlers(notificationsHandler(recurringReminders)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /3 unread/i }));

    const panel = within(await within(document.body).findByRole("dialog"));
    const entries = await panel.findAllByRole("link");

    await expect(entries[0]).toHaveTextContent("Payment due");
    await expect(entries[1]).toHaveTextContent("Expected");
    await expect(entries[2]).toHaveTextContent("Transfer due");
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadFailed: Story = { parameters: { msw: { handlers: errorHandlers } } };
