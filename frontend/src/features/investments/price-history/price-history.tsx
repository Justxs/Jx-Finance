import { useTranslation } from "react-i18next";
import { useDeleteSecurityPrice, useSecurityPricesSuspense } from "@/api/generated";
import type { SecurityResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { FormError } from "@/components/form-error/form-error";
import { RecordRow } from "@/components/record-row/record-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { ScrollRegion } from "@/components/ui/table/table";
import { childDelete, useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useIsoDate, usePriceFormat } from "@/hooks/use-formatters";
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
      <FormError error={deleteMutation.error} />
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
                  point.date === security.lastPriceDate
                    ? t("investments.priceHistory.newest")
                    : null
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
