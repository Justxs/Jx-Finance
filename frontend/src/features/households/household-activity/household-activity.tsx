import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHouseholdAuditSuspense } from "@/api/generated";
import type { AuditEventResponse, HouseholdMemberResponse } from "@/api/generated/model";
import { PagedRows } from "@/components/paged-rows/paged-rows";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { Tag } from "@/components/ui/tag/tag";
import { useDateTime } from "@/hooks/use-formatters";
import { usePagedItems, usePagedList } from "@/hooks/use-paged-list";
import { ActivityFilterBar } from "./activity-filter-bar";
import { ALL, type ActivityFilters, NO_FILTERS, filterKey } from "./activity-filters";
import { sentenceKey, useChangeText } from "./activity-sentences";

export const ACTIVITY_PAGE_SIZE = 10;
const AUDIT_RETENTION_DAYS = 400;

interface EventProps {
  event: AuditEventResponse;
}

export function ActivityEvent({ event }: Readonly<EventProps>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();
  const changeText = useChangeText();
  const actor = event.actorName || t("audit.unknownActor");
  const changes = event.changes.map(changeText).join(", ");

  return (
    <li className="space-y-1 py-3">
      <p className="flex flex-wrap items-center gap-2 text-sm wrap-break-word">
        <Tag>{t(`audit.kinds.${event.entityKind}`)}</Tag>
        <span className="min-w-0">
          {t(`audit.sentences.${sentenceKey(event)}`, { actor, description: event.description })}
        </span>
      </p>
      {changes ? <p className="text-sm wrap-break-word text-muted-foreground">{changes}</p> : null}
      <p className="text-xs text-muted-foreground tabular-nums">
        <time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time>
      </p>
    </li>
  );
}

interface ListProps {
  householdId: string;
  filters: ActivityFilters;
}

function ActivityList({ householdId, filters }: Readonly<ListProps>) {
  const { t } = useTranslation();
  const paging = usePagedList();
  const audit = useHouseholdAuditSuspense(householdId, {
    page: paging.shownPage,
    pageSize: ACTIVITY_PAGE_SIZE,
    memberId: filters.memberId === ALL ? undefined : filters.memberId,
    kind: filters.kind === ALL ? undefined : filters.kind,
    dateFrom: filters.from || undefined,
    dateTo: filters.to || undefined,
  });
  const { items: events, pages } = usePagedItems(paging, audit.data, ACTIVITY_PAGE_SIZE);
  const filtered =
    filters.memberId !== ALL || filters.kind !== ALL || Boolean(filters.from || filters.to);

  return (
    <PagedRows
      paging={paging}
      pages={pages}
      count={events.length}
      emptyText={filtered ? t("audit.emptyFiltered") : t("audit.empty")}
    >
      {events.map((event) => (
        <ActivityEvent key={event.id} event={event} />
      ))}
    </PagedRows>
  );
}

interface Props {
  householdId: string;
  members: readonly HouseholdMemberResponse[];
}

export function HouseholdActivity({ householdId, members }: Readonly<Props>) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<ActivityFilters>(NO_FILTERS);
  const titleId = `${householdId}-activity-title`;

  return (
    <section aria-labelledby={titleId} className="space-y-3 border-t pt-4">
      <div className="space-y-1">
        <h3 id={titleId} className="text-sm font-semibold">
          {t("audit.title")}
        </h3>
        <p className="max-w-prose text-sm text-muted-foreground">
          {t("audit.description", { days: AUDIT_RETENTION_DAYS })}
        </p>
      </div>
      <ActivityFilterBar
        idPrefix={householdId}
        members={members}
        value={filters}
        onChange={setFilters}
      />
      <QueryBoundary fallback={<Skeleton className="h-32 w-full" />}>
        <ActivityList key={filterKey(filters)} householdId={householdId} filters={filters} />
      </QueryBoundary>
    </section>
  );
}
