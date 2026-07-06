import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse } from "@/api/generated/model";
import { buttonVariants } from "@/components/ui/button";
import { TransactionFilters } from "./transaction-filters";

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  exportUrl: string;
}

export function TransactionsToolbar({ accounts, categories, exportUrl }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{t("transactions.filters")}</h2>
        <a href={exportUrl} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Download />
          {t("transactions.exportCsv")}
        </a>
      </div>
      <TransactionFilters accounts={accounts} categories={categories} />
    </section>
  );
}
