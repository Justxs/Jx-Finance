import { Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useRestoreDeleted, useTrashSuspense } from "@/api/generated";
import type { TrashEntryResponse } from "@/api/generated/model";
import { PagedRows } from "@/components/paged-rows/paged-rows";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { Tag } from "@/components/ui/tag/tag";
import { useDateTime } from "@/hooks/use-formatters";
import { usePagedItems, usePagedList } from "@/hooks/use-paged-list";

const TRASH_PAGE_SIZE = 10;
const TRASH_RETENTION_DAYS = 30;

interface RowProps {
  entry: TrashEntryResponse;
  pending: boolean;
  disabled: boolean;
  onRestore: () => void;
}

function TrashRow({ entry, pending, disabled, onRestore }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();

  return (
    <RowTransition>
      <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium wrap-break-word">
            <Tag>{t(`trash.kinds.${entry.kind}`)}</Tag>
            {entry.description}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatDateTime(entry.deletedAt)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="self-start sm:self-auto"
          pending={pending}
          disabled={disabled}
          onClick={onRestore}
          aria-label={`${t("trash.restore")}: ${entry.description}`}
        >
          <Undo2 />
          {t("trash.restore")}
        </Button>
      </li>
    </RowTransition>
  );
}

function TrashList() {
  const { t } = useTranslation();
  const paging = usePagedList();
  const trash = useTrashSuspense({ page: paging.shownPage, pageSize: TRASH_PAGE_SIZE });
  const { items: entries, pages } = usePagedItems(paging, trash.data, TRASH_PAGE_SIZE);

  const restoreMutation = useRestoreDeleted({
    mutation: { onSuccess: () => toast.success(t("trash.restored")) },
  });
  const restoringId = restoreMutation.isPending
    ? restoreMutation.variables?.data.entityId
    : undefined;

  return (
    <PagedRows paging={paging} pages={pages} count={entries.length} emptyText={t("trash.empty")}>
      {entries.map((entry) => (
        <TrashRow
          key={entry.id}
          entry={entry}
          pending={restoringId === entry.entityId}
          disabled={restoreMutation.isPending}
          onRestore={() =>
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
    <Section aria-labelledby="trash-title">
      <SectionTitle id="trash-title">{t("trash.title")}</SectionTitle>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        {t("trash.description", { days: TRASH_RETENTION_DAYS })}
      </p>
      <div className="mt-4">
        <QueryBoundary fallback={<Skeleton className="h-32 w-full" />}>
          <TrashList />
        </QueryBoundary>
      </div>
    </Section>
  );
}
