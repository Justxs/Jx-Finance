import type { ComponentProps } from "react";
import { LanguageToggle } from "@/components/language-toggle/language-toggle";
import {
  NotificationBell,
  NotificationBellUnavailable,
} from "@/components/notification-bell/notification-bell";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { ThemeToggle } from "@/components/theme-toggle/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton/skeleton";

export function HeaderActions(props: Readonly<ComponentProps<typeof NotificationBell>>) {
  return (
    <>
      <QueryBoundary
        fallback={<Skeleton className="size-9 rounded-md" />}
        error={<NotificationBellUnavailable />}
      >
        <NotificationBell {...props} />
      </QueryBoundary>
      <LanguageToggle />
      <ThemeToggle />
    </>
  );
}
