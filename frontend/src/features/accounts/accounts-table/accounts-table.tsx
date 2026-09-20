import { useNavigate, useSearch } from "@tanstack/react-router";
import { Archive, ArrowLeftRight, Pencil } from "lucide-react";
import { type ReactNode, ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { ColumnFilter, TextColumnFilter } from "@/components/ui/column-filter/column-filter";
import { SortableTableHead } from "@/components/ui/column-header/column-header";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { StaleRegion, staleVariants } from "@/components/ui/stale-region/stale-region";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmptyRow,
  ScrollRegion,
} from "@/components/ui/table/table";
import { Tag } from "@/components/ui/tag/tag";
import { EMPTY_VALUE, useMoney, useUsableCurrencies } from "@/hooks/use-formatters";
import { useSearchTable } from "@/hooks/use-search-table";
import { AccountTypeIcon } from "@/lib/account-icons";
import { nameById } from "@/lib/options";
import { cn } from "@/lib/utils";
import { accountTypes } from "../account-types";

interface Props {
  accounts: AccountResponse[];
  stale: boolean;
  onEdit: (id: string) => void;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onConvert?: (id: string) => void;
}

function balanceClass(account: AccountResponse) {
  return cn(
    "text-right font-semibold tabular-nums",
    Number(account.currentBalance) < 0 && "text-expense",
  );
}

export function AccountsTable({
  accounts,
  stale,
  onEdit,
  deletingId,
  onDelete,
  onConvert,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const households = useHouseholdsSuspense();
  const search = useSearch({ from: "/accounts" });
  const navigate = useNavigate({ from: "/accounts" });

  const table = useSearchTable(search, (patch) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) }),
  );
  const { setFilter } = table;

  const filtered = Boolean(search.search) || Boolean(search.iban) || Boolean(search.type);
  const canConvert = useUsableCurrencies().length >= 2;
  const householdNames = nameById(households.data);

  function balanceLines(account: AccountResponse) {
    return (
      <>
        {money.format(Number(account.currentBalance), account.currency)}
        {account.balances.length > 1 ? (
          <ul className="mt-0.5 text-xs font-normal text-muted-foreground">
            {account.balances.map((balance) => (
              <li key={balance.currency}>
                {money.format(Number(balance.amount), balance.currency)}
              </li>
            ))}
          </ul>
        ) : null}
        {Number(account.holdingsValue ?? 0) > 0 ? (
          <p className="mt-0.5 text-xs font-normal text-muted-foreground">
            {t("accounts.holdings", { value: money.format(Number(account.holdingsValue)) })}
          </p>
        ) : null}
      </>
    );
  }

  function actions(account: AccountResponse) {
    return (
      <div className="flex justify-end gap-1">
        {onConvert ? (
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canConvert}
            onClick={() => onConvert(account.id)}
            aria-label={`${t("conversions.add")}: ${account.name}`}
          >
            <ArrowLeftRight />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onEdit(account.id)}
          aria-label={`${t("actions.edit")}: ${account.name}`}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          pending={deletingId === account.id}
          disabled={deletingId !== null}
          onClick={() => onDelete(account.id)}
          aria-label={`${t("actions.archive")}: ${account.name}`}
        >
          <Archive />
        </Button>
      </div>
    );
  }

  let body: ReactNode;
  if (accounts.length === 0) {
    body = (
      <TableEmptyRow colSpan={6} filtered={filtered}>
        {t("accounts.empty")}
      </TableEmptyRow>
    );
  } else {
    body = accounts.map((account) => (
      <TableRow key={account.id}>
        <TableCell className="max-w-72 min-w-48 whitespace-normal">
          <div className="flex items-start gap-2.5">
            <AccountTypeIcon
              type={account.type}
              className="mt-0.5 shrink-0 text-muted-foreground"
            />
            <div className="min-w-0">
              <p className="line-clamp-2 font-medium wrap-break-word" title={account.name}>
                {account.name}
              </p>
              {account.description ? (
                <p
                  className="mt-0.5 line-clamp-2 text-xs text-muted-foreground"
                  title={account.description}
                >
                  {account.description}
                </p>
              ) : null}
              {account.scope === "shared" ? (
                <Tag tone="accent" className="mt-1">
                  {t("sharing.sharedWith", {
                    household: householdNames.get(account.householdId ?? "") ?? "",
                  })}
                </Tag>
              ) : null}
            </div>
          </div>
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
          {account.iban || EMPTY_VALUE}
        </TableCell>
        <TableCell>{t(`accounts.types.${account.type}`)}</TableCell>
        <TableCell className="hidden text-right text-muted-foreground tabular-nums xl:table-cell">
          {money.format(Number(account.startingBalance), account.currency)}
        </TableCell>
        <TableCell className={balanceClass(account)}>{balanceLines(account)}</TableCell>
        <TableCell>{actions(account)}</TableCell>
      </TableRow>
    ));
  }

  return (
    <>
      <StaleRegion stale={stale} className="md:hidden">
        {accounts.length === 0 ? (
          <EmptyText filtered={filtered}>{t("accounts.empty")}</EmptyText>
        ) : (
          <Rows aria-label={t("accounts.title")}>
            {accounts.map((account) => {
              const secondary = [
                t(`accounts.types.${account.type}`),
                account.scope === "shared"
                  ? t("sharing.sharedWith", {
                      household: householdNames.get(account.householdId ?? "") ?? "",
                    })
                  : null,
                account.iban,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li key={account.id} className="py-2.5 text-sm">
                  <div className="flex items-start gap-3">
                    <p className="min-w-0 flex-1 font-medium wrap-break-word">{account.name}</p>
                    <div className={cn("shrink-0", balanceClass(account))}>
                      {balanceLines(account)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="min-w-0 flex-1 text-xs wrap-break-word text-muted-foreground">
                      {secondary}
                    </p>
                    <div className="-mr-2 shrink-0">{actions(account)}</div>
                  </div>
                </li>
              );
            })}
          </Rows>
        )}
      </StaleRegion>
      <section className="-mx-3 hidden md:block">
        <ViewTransition name="accounts-rows" enter="none" exit="none">
          <ScrollRegion aria-label={t("accounts.title")}>
            <Table className={cn("min-w-160", staleVariants({ stale }))} aria-busy={stale}>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label={t("accounts.name")}
                    {...table.sortProps("name")}
                    filter={
                      <TextColumnFilter
                        label={t("accounts.name")}
                        value={search.search ?? ""}
                        debounceMs={300}
                        onChange={(value) => setFilter({ search: value || undefined })}
                      />
                    }
                  />
                  <SortableTableHead
                    label={t("accounts.iban")}
                    {...table.sortProps("iban")}
                    filter={
                      <TextColumnFilter
                        label={t("accounts.iban")}
                        value={search.iban ?? ""}
                        debounceMs={300}
                        onChange={(value) => setFilter({ iban: value || undefined })}
                      />
                    }
                  />
                  <SortableTableHead
                    label={t("accounts.type")}
                    {...table.sortProps("type")}
                    filter={
                      <ColumnFilter
                        label={t("accounts.type")}
                        active={Boolean(search.type)}
                        onClear={() => setFilter({ type: undefined })}
                      >
                        <SelectField
                          aria-label={t("accounts.type")}
                          value={search.type ?? ""}
                          onChange={(value) => setFilter({ type: value || undefined })}
                          options={[
                            { value: "", label: t("accounts.allTypes") },
                            ...accountTypes.map((type) => ({
                              value: type,
                              label: t(`accounts.types.${type}`),
                            })),
                          ]}
                        />
                      </ColumnFilter>
                    }
                  />
                  <SortableTableHead
                    className="hidden text-right xl:table-cell"
                    label={t("accounts.startingBalance")}
                    {...table.sortProps("startingBalance")}
                  />
                  <SortableTableHead
                    className="text-right"
                    label={t("accounts.currentBalance")}
                    {...table.sortProps("currentBalance")}
                  />
                  <TableHead>
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{body}</TableBody>
            </Table>
          </ScrollRegion>
        </ViewTransition>
      </section>
    </>
  );
}
