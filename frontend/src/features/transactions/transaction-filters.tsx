import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
}

export function TransactionFilters({ accounts, categories }: Readonly<Props>) {
  const { t } = useTranslation();
  const search = useSearch({ from: "/transactions" });
  const navigate = useNavigate({ from: "/transactions" });

  function setFilter(patch: Partial<typeof search>) {
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) });
  }

  const hasActiveFilters =
    !!search.search ||
    !!search.accountId ||
    !!search.categoryId ||
    !!search.type ||
    !!search.dateFrom ||
    !!search.dateTo;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full min-w-48 flex-1 sm:w-56 sm:flex-none">
        <Input
          placeholder={t("transactions.searchPlaceholder")}
          value={search.search ?? ""}
          onChange={(e) => setFilter({ search: e.target.value || undefined })}
        />
      </div>

      <div className="w-36">
        <Select
          value={search.type ?? ""}
          onChange={(e) =>
            setFilter({ type: (e.target.value || undefined) as "income" | "expense" | undefined })
          }
        >
          <option value="">{t("transactions.allTypes")}</option>
          <option value="expense">{t("transactions.expense")}</option>
          <option value="income">{t("transactions.income")}</option>
        </Select>
      </div>

      <div className="w-40">
        <Select
          value={search.accountId ?? ""}
          onChange={(e) => setFilter({ accountId: e.target.value || undefined })}
        >
          <option value="">{t("transactions.allAccounts")}</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-40">
        <Select
          value={search.categoryId ?? ""}
          onChange={(e) => setFilter({ categoryId: e.target.value || undefined })}
        >
          <option value="">{t("transactions.allCategories")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-36">
        <Input
          type="date"
          value={search.dateFrom ?? ""}
          onChange={(e) => setFilter({ dateFrom: e.target.value || undefined })}
        />
      </div>

      <div className="w-36">
        <Input
          type="date"
          value={search.dateTo ?? ""}
          onChange={(e) => setFilter({ dateTo: e.target.value || undefined })}
        />
      </div>

      {hasActiveFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate({ search: { page: 1 } })}
        >
          {t("transactions.clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}
