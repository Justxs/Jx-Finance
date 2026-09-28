import { useMeSuspense, useMyDiscordSuspense } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SectionSkeleton } from "@/components/ui/skeleton/skeleton";
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
    <QueryBoundary fallback={<SectionSkeleton rows={8} />}>
      <NotificationSettings />
    </QueryBoundary>
  );
}
