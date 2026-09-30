import { Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRestoreDeleted, useTrashSuspense } from "@/api/generated";
import { PagedRows } from "@/components/paged-rows/paged-rows";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { TitledSection } from "@/components/ui/section/section";
import { Tag } from "@/components/ui/tag/tag";
import { ActionRow, ActionRowsSkeleton } from "@/features/profile/action-row/action-row";
import { useDateTime } from "@/hooks/use-formatters";
import { usePagedItems, usePagedList } from "@/hooks/use-paged-list";
import { notify } from "@/lib/mutations";

const TRASH_PAGE_SIZE = 10;
const TRASH_RETENTION_DAYS = 30;

function TrashList() {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();
  const paging = usePagedList();
  const trash = useTrashSuspense({ page: paging.shownPage, pageSize: TRASH_PAGE_SIZE });
  const { items: entries, pages, range } = usePagedItems(paging, trash.data, TRASH_PAGE_SIZE);

  const restoreMutation = useRestoreDeleted({ mutation: notify(t("trash.restored")) });
  const restoringId = restoreMutation.isPending
    ? restoreMutation.variables?.data.entityId
    : undefined;

  return (
    <PagedRows
      paging={paging}
      pages={pages}
      range={range}
      count={entries.length}
      emptyText={t("trash.empty")}
    >
      {entries.map((entry) => (
        <ActionRow
          key={entry.id}
          title={
            <>
              <Tag>{t(`trash.kinds.${entry.kind}`)}</Tag>
              {entry.description}
            </>
          }
          details={
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatDateTime(entry.deletedAt)}
            </p>
          }
          icon={Undo2}
          actionLabel={t("trash.restore")}
          itemLabel={entry.description}
          pending={restoringId === entry.entityId}
          disabled={restoreMutation.isPending}
          onAction={() =>
            restoreMutation.mutate({ data: { kind: entry.kind, entityId: entry.entityId } })
          }
        />
      ))}
    </PagedRows>
  );
}

export function TrashSection() {
  const { t } = useTranslation();

  return (
    <TitledSection
      title={t("trash.title")}
      description={t("trash.description", { days: TRASH_RETENTION_DAYS })}
      bodyGap="md"
    >
      <QueryBoundary fallback={<ActionRowsSkeleton rows={3} />}>
        <TrashList />
      </QueryBoundary>
    </TitledSection>
  );
}
