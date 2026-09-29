import { useSearch } from "@tanstack/react-router";
import { NamedRowsSkeleton } from "@/components/named-row/named-row";
import { useNavSections } from "@/components/section-nav/section-nav";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  SectionSkeleton,
  Skeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";
import { ActionRowsSkeleton } from "@/features/profile/action-row/action-row";
import { SettingsPending } from "@/features/settings/settings-layout/settings-pending";
import { profileSections } from "@/features/settings/settings-nav/settings-nav";

const NOTIFICATION_KINDS = 7;

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <TextSkeleton size="label" />
      <Skeleton className="h-9 w-full rounded-lg pointer-coarse:h-11" />
    </div>
  );
}

function ProfileFormSkeleton() {
  return (
    <Section aria-hidden="true" className="space-y-4 *:max-w-md">
      <TextSkeleton size="title" width="w-40" />
      <FieldSkeleton />
      <FieldSkeleton />
      <FieldSkeleton />
      <div className="flex justify-end">
        <ButtonSkeleton />
      </div>
    </Section>
  );
}

function TwoFactorSkeleton() {
  return (
    <Section aria-hidden="true" className="space-y-4 *:max-w-md">
      <TextSkeleton size="title" width="w-48" />
      <TextSkeleton size="sm" width="w-3/4" />
      <FieldSkeleton />
      <ButtonSkeleton className="w-40" />
    </Section>
  );
}

export function SessionListSkeleton() {
  return (
    <div aria-hidden="true">
      <ActionRowsSkeleton rows={2} />
      <div className="flex justify-end pt-3">
        <Skeleton className="h-8 w-40 rounded-lg pointer-coarse:h-11" />
      </div>
    </div>
  );
}

function SectionIntroSkeleton() {
  return (
    <div className="max-w-prose space-y-1">
      <TextSkeleton size="title" width="w-44" />
      <TextSkeleton size="sm" width="w-full" />
    </div>
  );
}

export function NotificationsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-5">
      <Section>
        <SectionIntroSkeleton />
        <div className="mt-4 max-w-3xl text-sm">
          <div className="flex h-9 items-center gap-3 border-b">
            <TextSkeleton size="xs" className="flex-1" width="w-12" />
            <TextSkeleton size="xs" className="w-16 justify-center sm:w-24" width="w-10" />
            <TextSkeleton size="xs" className="w-16 justify-center sm:w-24" width="w-10" />
            <TextSkeleton size="xs" className="w-16 justify-center sm:w-24" width="w-10" />
          </div>
          {Array.from({ length: NOTIFICATION_KINDS }, (_, index) => (
            <div key={index} className="flex items-center gap-3 border-b py-2.5 last:border-b-0">
              <TextSkeleton size="sm" className="flex-1" width={rowWidth(index)} />
              <Skeleton className="mx-6 size-4 sm:mx-10" />
              <Skeleton className="mx-6 size-4 sm:mx-10" />
              <Skeleton className="mx-6 size-4 sm:mx-10" />
            </div>
          ))}
        </div>
      </Section>
      <Section className="space-y-5">
        <SectionIntroSkeleton />
        <div className="max-w-md space-y-4">
          <div className="space-y-1.5">
            <TextSkeleton size="label" />
            <Skeleton className="h-9 w-full rounded-lg pointer-coarse:h-11" />
            <TextSkeleton size="xs" width="w-3/4" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="size-4 shrink-0" />
            <TextSkeleton size="sm" width="w-48" />
          </div>
        </div>
      </Section>
      <div className="flex justify-end">
        <ButtonSkeleton className="w-20" />
      </div>
    </div>
  );
}

function ProfileSectionSkeleton({
  section,
}: Readonly<{ section: (typeof profileSections)[number] }>) {
  switch (section) {
    case "account":
      return <ProfileFormSkeleton />;
    case "security":
      return (
        <>
          <TwoFactorSkeleton />
          <SectionSkeleton description>
            <NamedRowsSkeleton rows={2} />
          </SectionSkeleton>
        </>
      );
    case "sessions":
      return (
        <SectionSkeleton description>
          <SessionListSkeleton />
        </SectionSkeleton>
      );
    case "notifications":
      return <NotificationsSkeleton />;
    case "trash":
      return (
        <SectionSkeleton description>
          <ActionRowsSkeleton rows={3} />
        </SectionSkeleton>
      );
    default:
      return <SectionSkeleton description rows={6} />;
  }
}

export function ProfilePending() {
  const requested = useSearch({ strict: false, select: (search) => search.section });
  const { section } = useNavSections(
    profileSections,
    profileSections.find((item) => item === requested),
    "account",
  );

  return (
    <SettingsPending current={section}>
      <ProfileSectionSkeleton section={section} />
    </SettingsPending>
  );
}
