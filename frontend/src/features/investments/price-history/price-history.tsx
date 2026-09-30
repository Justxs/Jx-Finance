import { useTranslation } from "react-i18next";
import {
  useDeleteSecurityPrice,
  useImportSecurityPrices,
  useSecurityPricesSuspense,
} from "@/api/generated";
import type { SecurityResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { FormError } from "@/components/form-error/form-error";
import { RecordRow } from "@/components/record-row/record-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { FileInput } from "@/components/ui/file-input/file-input";
import { Rows } from "@/components/ui/rows/rows";
import { ScrollRegion } from "@/components/ui/table/table";
import { Tag } from "@/components/ui/tag/tag";
import { childDelete, useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useIsoDate, useNumberFormat, usePriceFormat } from "@/hooks/use-formatters";
import { silentMutation } from "@/lib/mutations";

interface Props {
  security: SecurityResponse;
}

export function PriceHistory({ security }: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const formatPrice = usePriceFormat();
  const prices = useSecurityPricesSuspense(security.id);
  const deleteMutation = useDeleteSecurityPrice({ mutation: silentMutation });
  const importMutation = useImportSecurityPrices({ mutation: silentMutation });
  const count = useNumberFormat();
  const imported = importMutation.data;

  function importFile(file: File | undefined) {
    if (file) {
      importMutation.mutate({ id: security.id, data: { file } });
    }
  }

  const points = prices.data.map((point) => ({ ...point, id: point.date }));

  function label(point: { date: string; price: string }) {
    return `${formatPrice(Number(point.price), security.currency)}, ${formatDate(point.date)}`;
  }

  const remove = useConfirmedDelete(
    childDelete(
      deleteMutation,
      (date) => ({ id: security.id, date }),
      (variables) => variables.date,
    ),
    points,
    (point) => `${security.symbol} · ${label(point)}`,
  );

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <FileInput
          id={`price-import-${security.id}`}
          variant="button"
          accept=".csv,.txt,text/csv"
          disabled={importMutation.isPending}
          placeholder={t("investments.importPrices.action")}
          onChange={(event) => importFile(event.target.files?.[0])}
        />
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {imported
            ? t("investments.importPrices.result", {
                written: count.format(imported.written),
                skipped: count.format(imported.skipped),
                unreadable: count.format(imported.unreadable),
              })
            : t("investments.importPrices.hint")}
        </p>
      </div>
      <FormError error={importMutation.error ?? deleteMutation.error} />
      {points.length === 0 ? (
        <EmptyText>{t("investments.priceHistory.empty")}</EmptyText>
      ) : (
        <ScrollRegion
          aria-label={t("investments.priceHistory.title")}
          className="mt-2 max-h-56 overflow-y-auto pr-1"
        >
          <Rows>
            {points.map((point) => (
              <RecordRow
                key={point.id}
                title={formatDate(point.date)}
                subtitle={
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Tag>{t(`investments.priceSourceKind.${point.source}`)}</Tag>
                    {point.date === security.lastPriceDate
                      ? t("investments.priceHistory.newest")
                      : null}
                  </span>
                }
                amount={formatPrice(Number(point.price), security.currency)}
                label={label(point)}
                {...remove.deleteProps(point.id)}
              />
            ))}
          </Rows>
        </ScrollRegion>
      )}
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </>
  );
}
