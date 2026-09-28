import { useMeSuspense, useMyDiscordSuspense } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { NotificationsSkeleton } from "../profile-page/profile-page-pending";
import { NotificationsForm } from "./notifications-form";

function NotificationSettings() {
  const profile = useMeSuspense().data;
  const discord = useMyDiscordSuspense().data;

  return (
    <NotificationsForm
      key={JSON.stringify([
        profile.emailNotificationTypes,
        discord.hasWebhook,
        discord.isEnabled,
        discord.types,
      ])}
      profile={profile}
      discord={discord}
    />
  );
}

export function NotificationsSection() {
  return (
    <QueryBoundary fallback={<NotificationsSkeleton />}>
      <NotificationSettings />
    </QueryBoundary>
  );
}
