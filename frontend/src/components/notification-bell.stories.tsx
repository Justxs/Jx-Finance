import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import type { NotificationResponse } from "@/api/generated/model";
import { notifications } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { NotificationBell } from "./notification-bell";
import { QueryBoundary } from "./query-boundary";
import { Skeleton } from "./ui/skeleton";

function notificationsHandler(items: NotificationResponse[]) {
  return http.get("*/api/notifications", ({ request }) => {
    const unreadOnly = new URL(request.url).searchParams.get("unread") === "true";
    return HttpResponse.json(unreadOnly ? items.filter((item) => !item.isRead) : items);
  });
}

const allRead: NotificationResponse[] = notifications.map((item) => ({ ...item, isRead: true }));

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
  parameters: { msw: { handlers: [notificationsHandler(allRead), ...handlers] } },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const ManyUnread: Story = {
  parameters: { msw: { handlers: [notificationsHandler(manyUnread), ...handlers] } },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadFailed: Story = { parameters: { msw: { handlers: errorHandlers } } };
