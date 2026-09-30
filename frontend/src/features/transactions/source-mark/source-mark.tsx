import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { cn } from "@/lib/utils";

interface Props {
  transaction: Pick<TransactionResponse, "source">;
  className?: string;
}

export function SourceMark({ transaction, className }: Readonly<Props>) {
  const { t } = useTranslation();

  if (transaction.source !== "api") {
    return null;
  }

  return (
    <p className={cn("text-sm text-muted-foreground", className)}>{t("transactions.sourceApi")}</p>
  );
}
