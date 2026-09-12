import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse } from "@/api/generated/model";
import { buttonVariants } from "@/components/ui/button";
import { TransactionFilters } from "./transaction-filters";

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  exportUrl: string;
  exportPdfUrl: string;
}

export function TransactionsToolbar({
  accounts,
  categories,
  exportUrl,
  exportPdfUrl,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{t("transactions.filters")}</h2>
        <div className="flex flex-wrap gap-2">
          <a href={exportUrl} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Download />
            {t("transactions.exportCsv")}
          </a>
          <a href={exportPdfUrl} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Download />
            {t("transactions.exportPdf")}
          </a>
        </div>
      </div>
      <TransactionFilters accounts={accounts} categories={categories} />
    </section>
  );
}
