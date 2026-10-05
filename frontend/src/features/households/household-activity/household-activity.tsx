import { type ComponentProps, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHouseholdAuditSuspense } from "@/api/generated";
import type { AuditEventResponse, HouseholdMemberResponse } from "@/api/generated/model";
import { PagedRows } from "@/components/paged-rows/paged-rows";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Rows } from "@/components/ui/rows/rows";
import { Skeleton, TextSkeleton, rowWidth } from "@/components/ui/skeleton/skeleton";
import { Tag } from "@/components/ui/tag/tag";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useDateTime } from "@/hooks/use-formatters";
import { usePagedItems } from "@/hooks/use-paged-list";
import { ActivityFilterBar } from "./activity-filter-bar";
import { ALL, type ActivityFilters, NO_FILTERS } from "./activity-filters";
import { sentenceKey, useChangeText } from "./activity-sentences";

const ACTIVITY_PAGE_SIZE = 10;
const AUDIT_RETENTION_DAYS = 400;

interface EventProps {
  event: AuditEventResponse;
}

export function ActivityEvent({ event }: Readonly<EventProps>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();
  const changeText = useChangeText();
  const name = event.actorName || t("audit.unknownActor");
  const actor = event.viaToken
    ? t("audit.actorViaToken", { actor: name, token: event.viaToken })
    : name;
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

function ActivitySkeleton() {
  return (
    <Rows aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index} className="space-y-1 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5.5 w-20 shrink-0 rounded-sm" />
            <TextSkeleton size="sm" className="flex-1" width={rowWidth(index)} />
          </div>
          <TextSkeleton size="xs" width="w-28" />
        </li>
      ))}
    </Rows>
  );
}

interface ListProps {
  householdId: string;
  filters: ActivityFilters & { page: number };
  paging: ComponentProps<typeof PagedRows>["paging"];
}

function ActivityList({ householdId, filters, paging }: Readonly<ListProps>) {
  const { t } = useTranslation();
  const audit = useHouseholdAuditSuspense(householdId, {
    page: filters.page,
    pageSize: ACTIVITY_PAGE_SIZE,
    memberId: filters.memberId === ALL ? undefined : filters.memberId,
    kind: filters.kind === ALL ? undefined : filters.kind,
    dateFrom: filters.from || undefined,
    dateTo: filters.to || undefined,
  });
  const { items: events, pages, range } = usePagedItems(paging, audit.data, ACTIVITY_PAGE_SIZE);
  const filtered =
    filters.memberId !== ALL || filters.kind !== ALL || Boolean(filters.from || filters.to);

  return (
    <PagedRows
      paging={paging}
      pages={pages}
      range={range}
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
  const [page, setPage] = useState(1);
  const [shown, stale] = useDeferredParams({ ...filters, page });
  const titleId = `${householdId}-activity-title`;

  function changeFilters(next: ActivityFilters) {
    setFilters(next);
    setPage(1);
  }

  return (
    <section aria-labelledby={titleId} className="space-y-3 border-t pt-4">
      <div className="space-y-1">
        <h4 id={titleId} className="text-sm font-semibold">
          {t("audit.title")}
        </h4>
        <p className="max-w-prose text-sm text-muted-foreground">
          {t("audit.description", { days: AUDIT_RETENTION_DAYS })}
        </p>
      </div>
      <ActivityFilterBar
        idPrefix={householdId}
        members={members}
        value={filters}
        onChange={changeFilters}
      />
      <QueryBoundary fallback={<ActivitySkeleton />} errorSubject={t("audit.title")}>
        <ActivityList householdId={householdId} filters={shown} paging={{ page, setPage, stale }} />
      </QueryBoundary>
    </section>
  );
}
