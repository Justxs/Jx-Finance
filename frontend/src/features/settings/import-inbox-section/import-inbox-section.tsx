import { useTranslation } from "react-i18next";
import { useImportInboxStatusSuspense } from "@/api/generated";
import type { ImportInboxStatusResponse } from "@/api/generated/model";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { RuledLine } from "@/components/ui/ruled-line/ruled-line";
import { TitledSection } from "@/components/ui/section/section";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { ImportInboxSkeleton } from "@/features/settings/settings-page/settings-page-pending";
import { useDateTime } from "@/hooks/use-formatters";

function Failures({ status }: Readonly<{ status: ImportInboxStatusResponse }>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();

  return (
    <div className="mt-6 max-w-3xl">
      <h3 className="text-sm font-semibold">{t("settings.importInbox.failures")}</h3>
      {status.failures.length === 0 ? (
        <EmptyText size="sm">{t("settings.importInbox.noFailures")}</EmptyText>
      ) : (
        <div className="mt-2">
          <Table label={t("settings.importInbox.failures")} className="min-w-120">
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.importInbox.file")}</TableHead>
                <TableHead>{t("settings.importInbox.reason")}</TableHead>
                <TableHead>{t("settings.importInbox.at")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {status.failures.map((failure) => (
                <TableRow key={failure.fileName}>
                  <TableCell className="font-medium wrap-break-word whitespace-normal">
                    {failure.fileName}
                  </TableCell>
                  <TableCell className="whitespace-normal">{failure.reason}</TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(failure.at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function InboxStatus() {
  const { t } = useTranslation();
  const status = useImportInboxStatusSuspense().data;

  if (!status.directory) {
    return <p className="mt-4 max-w-prose text-sm">{t("settings.importInbox.off")}</p>;
  }

  return (
    <>
      <RuledLine as="p" className="mt-4">
        <span className="text-muted-foreground">{t("settings.importInbox.folder")}</span>{" "}
        <span className="font-mono font-semibold wrap-break-word">{status.directory}</span>
      </RuledLine>
      <Failures status={status} />
    </>
  );
}

export function ImportInboxSection() {
  const { t } = useTranslation();

  return (
    <TitledSection
      title={t("settings.importInbox.title")}
      description={t("settings.importInbox.description")}
    >
      <QueryBoundary
        fallback={<ImportInboxSkeleton />}
        errorSubject={t("settings.importInbox.title")}
      >
        <InboxStatus />
      </QueryBoundary>
    </TitledSection>
  );
}
