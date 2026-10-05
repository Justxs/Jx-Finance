import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FlowType } from "@/api/generated/model";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { cn } from "@/lib/utils";

interface TransactionsFilter {
  accountId?: string;
  categoryId?: string;
  tagIds?: string;
  payee?: string;
  place?: string;
  type?: FlowType;
  dateFrom?: string;
  dateTo?: string;
}

interface Props {
  name: string;
  filter: TransactionsFilter;
  className?: string;
}

export function TransactionsLink({ name, filter, className }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Tooltip content={t("dashboard.showTransactions", { category: name })}>
      <Link
        to="/transactions"
        search={{
          page: 1,
          ...filter,
          spreadOverlap: filter.dateFrom && filter.dateTo ? true : undefined,
        }}
        className={cn("rounded-sm underline-offset-4 focus-ring hover:underline", className)}
      >
        {name}
      </Link>
    </Tooltip>
  );
}
