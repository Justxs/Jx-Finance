import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import type { NotificationResponse } from "@/api/generated/model";
import { getNotificationsMockHandler } from "@/api/generated/notifications/notifications.msw";
import { withWidth } from "@/storybook/decorators";
import {
  budgetExceededNotification,
  budgetWarningNotification,
  expenseDueNotification,
  incomeDueNotification,
  monthReadyNotification,
  notifications,
  priceRiseNotification,
  transferDueNotification,
  unusualAmountNotification,
  unusualAmountsNotification,
} from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { query } from "@/storybook/handlers/http";
import { openedDialog } from "@/storybook/interactions";
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
  decorators: [withWidth("flex h-96 w-[min(90vw,24rem)] items-start justify-end")],
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
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /2 unread/i }));

    const panel = within(await openedDialog());
    const alerts = await panel.findAllByRole("link");

    await expect(alerts).toHaveLength(2);
    await expect(alerts[0]).toHaveAttribute("href", "/budgets");
    await expect(alerts[0]).toHaveTextContent("Weekly limit reached");
    await expect(alerts[1]).toHaveTextContent("Monthly limit: 80% used");
  },
};

export const RecurringEntryReminders: Story = {
  parameters: withHandlers(notificationsHandler(recurringReminders)),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /3 unread/i }));

    const panel = within(await openedDialog());
    const entries = await panel.findAllByRole("link");

    await expect(entries[0]).toHaveTextContent("Payment due");
    await expect(entries[1]).toHaveTextContent("Expected");
    await expect(entries[2]).toHaveTextContent("Transfer due");
  },
};

export const UnusualAmountsPriceRisesAndMonthClose: Story = {
  parameters: withHandlers(
    notificationsHandler([
      unusualAmountNotification,
      unusualAmountsNotification,
      priceRiseNotification,
      monthReadyNotification,
    ]),
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /4 unread/i }));

    const panel = within(await openedDialog());
    const entries = await panel.findAllByRole("link");

    await expect(entries[0]).toHaveTextContent(/€249\.00: 4× the usual €61\.90/u);
    await expect(entries[0]).toHaveAttribute("href", expect.stringContaining("unusual=true"));
    await expect(entries[1]).toHaveTextContent("5 expenses are well above their usual amount");
    await expect(entries[2]).toHaveTextContent(/Charged €27\.99, expected €24\.99/u);
    await expect(entries[3]).toHaveTextContent("August 2026 has ended and is ready to close");
    await expect(entries[3]).toHaveAttribute("href", expect.stringContaining("month=2026-08"));
  },
};

export const SidebarRow: Story = {
  args: { sidebar: "expanded" },
  decorators: [withWidth("flex h-96 w-58 flex-col justify-end")],
  play: async ({ canvas }) => {
    const row = await canvas.findByRole("button", { name: /unread/i });

    await expect(row).toHaveTextContent("Notifications");
  },
};

export const SidebarCollapsed: Story = {
  args: { sidebar: "collapsed" },
  decorators: [withWidth("flex h-96 w-16 flex-col justify-end px-2")],
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadFailed: Story = { parameters: { msw: { handlers: errorHandlers } } };
