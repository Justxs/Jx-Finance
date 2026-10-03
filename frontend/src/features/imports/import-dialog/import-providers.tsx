import { ChevronRight, FileSpreadsheet, Landmark, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getListCsvMappingsQueryKey,
  useDeleteCsvMapping,
  useListCsvMappingsSuspense,
  useListImportInboxSuspense,
} from "@/api/generated";
import type {
  AccountResponse,
  CsvMappingResponse,
  ImportInboxFileResponse,
  StatementFormat,
} from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { RowActions } from "@/components/row-actions/row-actions";
import { Rows } from "@/components/ui/rows/rows";
import {
  ImportInboxList,
  type InboxReview,
} from "@/features/imports/import-inbox-list/import-inbox-list";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { optimisticRemoval } from "@/lib/optimistic";

export interface ImportProvider {
  format: StatementFormat;
  name: string;
  mapping?: CsvMappingResponse;
}

interface Props {
  accounts: AccountResponse[];
  onChoose: (provider: ImportProvider) => void;
  onEdit: (mapping: CsvMappingResponse) => void;
  onReview: (provider: ImportProvider, review: InboxReview) => void;
}

function Chevron() {
  return <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />;
}

function ProviderButton({
  icon: Icon,
  name,
  format,
  chevron = true,
  onClick,
}: Readonly<{
  icon: LucideIcon;
  name: string;
  format: string;
  chevron?: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted"
    >
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium wrap-break-word">{name}</span>
        <span className="block text-xs text-muted-foreground">{format}</span>
      </span>
      {chevron ? <Chevron /> : null}
    </button>
  );
}

export function ImportProviders({ accounts, onChoose, onEdit, onReview }: Readonly<Props>) {
  const { t } = useTranslation();
  const mappings = useListCsvMappingsSuspense();
  const inbox = useListImportInboxSuspense();
  const deleteMutation = useDeleteCsvMapping({
    mutation: optimisticRemoval<CsvMappingResponse>(getListCsvMappingsQueryKey()),
  });
  const remove = useConfirmedDelete(
    deleteMutation,
    mappings.data,
    (mapping) => mapping.name,
    "csvImportMapping",
  );

  const fixed = [
    {
      format: "swedbankCsv",
      name: t("imports.providers.swedbank"),
      detail: t("imports.providers.swedbankFormat"),
    },
    {
      format: "camt053",
      name: t("imports.providers.camt053"),
      detail: t("imports.providers.camt053Format"),
    },
    {
      format: "ofx",
      name: t("imports.providers.ofx"),
      detail: t("imports.providers.ofxFormat"),
    },
    {
      format: "mt940",
      name: t("imports.providers.mt940"),
      detail: t("imports.providers.mt940Format"),
    },
  ] as const;

  function providerOf({ format, mappingId }: ImportInboxFileResponse): ImportProvider {
    const mapping = mappings.data.find((item) => item.id === mappingId);
    const name =
      mapping?.name ??
      fixed.find((item) => item.format === format)?.name ??
      t("imports.providers.genericCsv");
    return { format, name, mapping };
  }

  return (
    <>
      <ImportInboxList
        items={inbox.data}
        accounts={accounts}
        onReview={(review) => onReview(providerOf(review.item), review)}
      />
      <Rows className="-my-2">
        {fixed.map((item) => (
          <li key={item.format} className="flex">
            <ProviderButton
              icon={Landmark}
              name={item.name}
              format={item.detail}
              onClick={() => onChoose({ format: item.format, name: item.name })}
            />
          </li>
        ))}
        {mappings.data.map((mapping) => (
          <li key={mapping.id} className="flex items-center gap-2">
            <ProviderButton
              icon={FileSpreadsheet}
              name={mapping.name}
              format={t("imports.providers.savedMappingFormat")}
              chevron={false}
              onClick={() => onChoose({ format: "genericCsv", name: mapping.name, mapping })}
            />
            <RowActions
              label={mapping.name}
              onEdit={() => onEdit(mapping)}
              {...remove.deleteProps(mapping.id)}
            />
            <Chevron />
          </li>
        ))}
        <li className="flex">
          <ProviderButton
            icon={FileSpreadsheet}
            name={t("imports.providers.genericCsv")}
            format={t("imports.providers.genericCsvFormat")}
            onClick={() =>
              onChoose({ format: "genericCsv", name: t("imports.providers.genericCsv") })
            }
          />
        </li>
      </Rows>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </>
  );
}
