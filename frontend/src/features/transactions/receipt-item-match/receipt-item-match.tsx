import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { useIsoDate } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

interface Props {
  transaction: Pick<TransactionResponse, "receiptItem">;
  className?: string;
}

export function ReceiptItemMatch({ transaction, className }: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const item = transaction.receiptItem;

  if (!item) {
    return null;
  }

  const text = item.warrantyUntil
    ? t("transactions.receiptItemWarranty", {
        name: item.name,
        date: formatDate(item.warrantyUntil),
      })
    : t("transactions.receiptItem", { name: item.name });

  return (
    <span
      className={cn("line-clamp-1 text-xs wrap-break-word text-muted-foreground", className)}
      title={text}
    >
      {text}
    </span>
  );
}
