import { useHouseholdsSuspense, useMeSuspense } from "@/api/generated";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { NotificationsSkeleton } from "@/features/profile/profile-page/profile-page-pending";
import { NotificationsForm } from "./notifications-form";

function NotificationSettings() {
  const profile = useMeSuspense().data;
  const households = useHouseholdsSuspense().data;

  return <NotificationsForm profile={profile} households={households} />;
}

export function NotificationsSection() {
  return (
    <QueryBoundary fallback={<NotificationsSkeleton />}>
      <NotificationSettings />
    </QueryBoundary>
  );
}
