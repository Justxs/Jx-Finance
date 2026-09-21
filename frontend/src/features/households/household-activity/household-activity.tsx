import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHouseholdAuditSuspense } from "@/api/generated";
import type {
  AuditChangeResponse,
  AuditEntityKind,
  AuditEventResponse,
  HouseholdMemberResponse,
} from "@/api/generated/model";
import { Pagination } from "@/components/pagination/pagination";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SelectField } from "@/components/select-field/select-field";
import { DateRangePicker } from "@/components/ui/date-range-picker/date-range-picker";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Label } from "@/components/ui/label/label";
import { Rows } from "@/components/ui/rows/rows";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { Tag } from "@/components/ui/tag/tag";
import { useDateTime } from "@/hooks/use-formatters";
import { usePageClamp, usePagedList } from "@/hooks/use-paged-list";

export const ACTIVITY_PAGE_SIZE = 10;
export const AUDIT_RETENTION_DAYS = 400;

const ALL = "all";

const KINDS = [
  "transaction",
  "transfer",
  "conversion",
  "investmentTransaction",
  "account",
  "category",
  "tag",
  "member",
  "household",
] as const satisfies readonly AuditEntityKind[];

const FIELDS = [
  "amount",
  "date",
  "type",
  "description",
  "category",
  "account",
  "receivedAmount",
  "fromAccount",
  "toAccount",
  "fromAmount",
  "toAmount",
  "security",
  "quantity",
  "price",
  "fee",
  "cashAmount",
  "name",
  "icon",
  "startingBalance",
  "tags",
  "split",
  "role",
] as const;

type AuditField = (typeof FIELDS)[number];

type SentenceKey =
  | AuditEventResponse["action"]
  | "bulkUpdated"
  | "archived"
  | "createdHousehold"
  | "deletedHousehold"
  | "restoredHousehold";

export interface ActivityFilters {
  memberId: string;
  kind: AuditEntityKind | typeof ALL;
  from: string;
  to: string;
}

const HOUSEHOLD_SENTENCES: Partial<Record<AuditEventResponse["action"], SentenceKey>> = {
  created: "createdHousehold",
  deleted: "deletedHousehold",
  restored: "restoredHousehold",
};

const NO_FILTERS: ActivityFilters = { memberId: ALL, kind: ALL, from: "", to: "" };

function isAuditField(field: string): field is AuditField {
  return (FIELDS as readonly string[]).includes(field);
}

export function sentenceKey(event: AuditEventResponse): SentenceKey {
  if (event.action === "updated" && event.entityId === null) {
    return "bulkUpdated";
  }
  const householdKey = event.entityKind === "household" ? HOUSEHOLD_SENTENCES[event.action] : null;
  if (householdKey) {
    return householdKey;
  }
  if (event.entityKind === "account" && event.action === "deleted") {
    return "archived";
  }
  return event.action;
}

function useChangeText() {
  const { t } = useTranslation();

  return function changeText(change: AuditChangeResponse) {
    return t("audit.change", {
      field: isAuditField(change.field) ? t(`audit.fields.${change.field}`) : change.field,
      from: change.from ?? t("audit.none"),
      to: change.to ?? t("audit.none"),
    });
  };
}

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
  const { page, setPage, shownPage, stale } = paging;
  const audit = useHouseholdAuditSuspense(householdId, {
    page: shownPage,
    pageSize: ACTIVITY_PAGE_SIZE,
    memberId: filters.memberId === ALL ? undefined : filters.memberId,
    kind: filters.kind === ALL ? undefined : filters.kind,
    dateFrom: filters.from || undefined,
    dateTo: filters.to || undefined,
  });
  const pages = usePageClamp(paging, audit.data?.total ?? 0, ACTIVITY_PAGE_SIZE);
  const events = useDeferredValue(audit.data?.items) ?? [];
  const filtered =
    filters.memberId !== ALL || filters.kind !== ALL || Boolean(filters.from || filters.to);

  if (events.length === 0) {
    return <EmptyText>{filtered ? t("audit.emptyFiltered") : t("audit.empty")}</EmptyText>;
  }

  return (
    <>
      <StaleRegion stale={stale}>
        <Rows>
          {events.map((event) => (
            <ActivityEvent key={event.id} event={event} />
          ))}
        </Rows>
      </StaleRegion>
      <Pagination page={page} pages={pages} onPageChange={setPage} />
    </>
  );
}

interface FilterProps {
  idPrefix: string;
  members: readonly HouseholdMemberResponse[];
  value: ActivityFilters;
  onChange: (value: ActivityFilters) => void;
}

function ActivityFilterBar({ idPrefix, members, value, onChange }: Readonly<FilterProps>) {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("audit.filters.label")}
      className="flex flex-wrap items-end gap-x-4 gap-y-3"
    >
      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor={`${idPrefix}-activity-member`}>{t("audit.filters.member")}</Label>
        <SelectField
          id={`${idPrefix}-activity-member`}
          className="sm:w-48"
          value={value.memberId}
          onChange={(memberId) => onChange({ ...value, memberId })}
          options={[
            { value: ALL, label: t("audit.filters.everyone") },
            ...members.map((member) => ({
              value: member.userId,
              label: member.displayName || member.email,
            })),
          ]}
        />
      </div>
      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor={`${idPrefix}-activity-kind`}>{t("audit.filters.kind")}</Label>
        <SelectField<ActivityFilters["kind"]>
          id={`${idPrefix}-activity-kind`}
          className="sm:w-48"
          value={value.kind}
          onChange={(kind) => onChange({ ...value, kind })}
          options={[
            { value: ALL, label: t("audit.filters.allKinds") },
            ...KINDS.map((kind) => ({ value: kind, label: t(`audit.kinds.${kind}`) })),
          ]}
        />
      </div>
      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor={`${idPrefix}-activity-dates`}>{t("audit.filters.dates")}</Label>
        <DateRangePicker
          id={`${idPrefix}-activity-dates`}
          className="sm:w-64"
          value={{ from: value.from, to: value.to }}
          onChange={(range) => onChange({ ...value, from: range.from, to: range.to })}
        />
      </div>
    </div>
  );
}

function filterKey(filters: ActivityFilters) {
  return [filters.memberId, filters.kind, filters.from, filters.to].join("|");
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
