import { Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRestoreDeleted, useTrashSuspense } from "@/api/generated";
import { PagedRows } from "@/components/paged-rows/paged-rows";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { TitledSection } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { Tag } from "@/components/ui/tag/tag";
import { useDateTime } from "@/hooks/use-formatters";
import { usePagedItems, usePagedList } from "@/hooks/use-paged-list";
import { notify } from "@/lib/mutations";
import { ActionRow } from "../action-row/action-row";

const TRASH_PAGE_SIZE = 10;
const TRASH_RETENTION_DAYS = 30;

function TrashList() {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();
  const paging = usePagedList();
  const trash = useTrashSuspense({ page: paging.shownPage, pageSize: TRASH_PAGE_SIZE });
  const { items: entries, pages } = usePagedItems(paging, trash.data, TRASH_PAGE_SIZE);

  const restoreMutation = useRestoreDeleted(notify(t("trash.restored")));
  const restoringId = restoreMutation.isPending
    ? restoreMutation.variables?.data.entityId
    : undefined;

  return (
    <PagedRows paging={paging} pages={pages} count={entries.length} emptyText={t("trash.empty")}>
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
      <QueryBoundary fallback={<Skeleton className="h-32 w-full" />}>
        <TrashList />
      </QueryBoundary>
    </TitledSection>
  );
}
