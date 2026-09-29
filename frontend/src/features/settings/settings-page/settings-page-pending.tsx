import { useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FormGridSkeleton } from "@/components/ui/form-grid/form-grid";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  SectionSkeleton,
  Skeleton,
  TextSkeleton,
} from "@/components/ui/skeleton/skeleton";
import { TableSkeleton } from "@/components/ui/table/table";
import { SettingsPending } from "@/features/settings/settings-layout/settings-pending";
import { ALL_CURRENCIES } from "@/lib/currency";
import { type SettingsSection, settingsSections } from "../settings-nav/settings-nav";

const featureGroupSizes = { plan: 3, review: 5, ledger: 5 } as const;

interface CheckboxFieldSkeletonProps {
  hintLines?: 1 | 2;
  className?: string;
}

export function CheckboxFieldSkeleton({
  hintLines = 1,
  className,
}: Readonly<CheckboxFieldSkeletonProps>) {
  return (
    <div aria-hidden="true" className={className}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-4 shrink-0" />
        <TextSkeleton size="sm" width="w-48" />
      </div>
      <TextSkeleton size="xs" className="mt-0.5 ml-7" width="w-3/4 max-w-prose" />
      {hintLines === 2 ? <TextSkeleton size="xs" className="ml-7" width="w-1/2" /> : null}
    </div>
  );
}

function FeaturesSkeleton() {
  return (
    <div className="grid gap-x-10 gap-y-6 md:grid-cols-3">
      {Object.entries(featureGroupSizes).map(([group, size]) => (
        <div key={group} className="min-w-0">
          <TextSkeleton size="sm" width="w-20" />
          <Rows className="mt-1">
            {Array.from({ length: size }, (_, index) => (
              <li key={index} className="py-2.5">
                <CheckboxFieldSkeleton />
              </li>
            ))}
          </Rows>
        </div>
      ))}
    </div>
  );
}

function CurrenciesSkeleton() {
  return (
    <>
      <FormGridSkeleton fields={1} className="max-w-3xl" />
      <div className="mt-6">
        <TextSkeleton size="sm" width="w-40" />
        <TextSkeleton size="xs" className="mt-1" width="w-3/4 max-w-prose" />
        <div className="mt-2 flex gap-2">
          <ButtonSkeleton size="sm" />
          <ButtonSkeleton size="sm" />
        </div>
        <ul className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_CURRENCIES.map((currency) => (
            <li key={currency} className="flex items-center gap-3 py-1.5">
              <Skeleton className="size-4 shrink-0" />
              <TextSkeleton size="sm" className="w-9 shrink-0" width="w-8" />
              <TextSkeleton size="sm" className="flex-1" width="w-2/3" />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function SettingsFormSkeleton({ section }: Readonly<{ section: SettingsSection }>) {
  switch (section) {
    case "general":
      return (
        <SectionSkeleton>
          <FormGridSkeleton fields={1} hints className="max-w-3xl" />
          <CheckboxFieldSkeleton hintLines={2} className="mt-4 max-w-prose" />
        </SectionSkeleton>
      );
    case "features":
      return (
        <SectionSkeleton description>
          <FeaturesSkeleton />
        </SectionSkeleton>
      );
    case "currencies":
      return (
        <>
          <SectionSkeleton>
            <CurrenciesSkeleton />
          </SectionSkeleton>
          <SectionSkeleton>
            <CheckboxFieldSkeleton className="max-w-prose" />
            <Skeleton className="mt-5 h-14 max-w-3xl rounded-md" />
          </SectionSkeleton>
        </>
      );
    case "regional":
      return (
        <SectionSkeleton>
          <FormGridSkeleton fields={3} className="max-w-3xl" />
        </SectionSkeleton>
      );
    case "defaults":
      return (
        <SectionSkeleton>
          <FormGridSkeleton fields={2} hints className="max-w-3xl" />
        </SectionSkeleton>
      );
    default:
      return null;
  }
}

export function SmtpFormSkeleton() {
  return (
    <div aria-hidden="true" className="mt-4 space-y-5">
      <CheckboxFieldSkeleton className="max-w-prose" />
      <FormGridSkeleton fields={7} hints className="max-w-3xl" />
      <div className="flex flex-wrap items-center gap-3">
        <ButtonSkeleton className="w-32" />
        <TextSkeleton size="sm" width="w-56" />
        <ButtonSkeleton className="ml-auto w-20" />
      </div>
    </div>
  );
}

export function DiscordFormSkeleton() {
  return (
    <div aria-hidden="true" className="mt-4 space-y-5">
      <CheckboxFieldSkeleton className="max-w-prose" />
      <div className="flex justify-end">
        <ButtonSkeleton className="w-20" />
      </div>
    </div>
  );
}

export function BackupListSkeleton() {
  return (
    <>
      <TextSkeleton size="sm" width="w-56" />
      <TableSkeleton rows={3} columns={6} />
    </>
  );
}

function TitledSkeleton({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Section aria-hidden="true">
      <TextSkeleton size="title" width="w-40" />
      <TextSkeleton size="sm" className="mt-1" width="w-3/4 max-w-prose" />
      {children}
    </Section>
  );
}

function BackupSkeleton() {
  return (
    <TitledSkeleton>
      <div className="mt-4 space-y-4">
        <div className="flex max-w-xl gap-2">
          <Skeleton className="h-9 min-w-56 flex-1 rounded-lg pointer-coarse:h-11" />
          <ButtonSkeleton className="w-36" />
        </div>
        <BackupListSkeleton />
      </div>
      <div className="mt-8 max-w-xl space-y-3">
        <TextSkeleton size="sm" width="w-40" />
        <TextSkeleton size="sm" width="w-3/4" />
        <FormGridSkeleton fields={1} />
        <ButtonSkeleton />
      </div>
    </TitledSkeleton>
  );
}

function SectionBodySkeleton({ section }: Readonly<{ section: SettingsSection }>) {
  switch (section) {
    case "email":
    case "receipts":
      return (
        <TitledSkeleton>
          <SmtpFormSkeleton />
        </TitledSkeleton>
      );
    case "discord":
      return (
        <TitledSkeleton>
          <DiscordFormSkeleton />
        </TitledSkeleton>
      );
    case "backups":
      return <BackupSkeleton />;
    default:
      return <SettingsFormSkeleton section={section} />;
  }
}

export function SettingsPagePending() {
  const requested = useSearch({ strict: false, select: (search) => search.section });
  const section = settingsSections.find((item) => item === requested) ?? "general";

  return (
    <SettingsPending current={section}>
      <SectionBodySkeleton section={section} />
    </SettingsPending>
  );
}
