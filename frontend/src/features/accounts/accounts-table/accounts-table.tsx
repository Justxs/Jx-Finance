import { useNavigate, useSearch } from "@tanstack/react-router";
import { Archive, ArrowLeftRight, Pencil } from "lucide-react";
import { type ReactNode, ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import { useGetHouseholdsSuspense } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { ColumnFilter, TextColumnFilter } from "@/components/ui/column-filter";
import { nextSortDirection, SortableTableHead } from "@/components/ui/column-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { EMPTY_VALUE, useMoney, useUsableCurrencies } from "@/hooks/use-formatters";
import { AccountTypeIcon } from "@/lib/account-icons";
import { cn } from "@/lib/utils";
import { AccountForm, type AccountFormValues } from "../account-form";
import { accountTypes } from "../account-types";

interface Props {
  accounts: AccountResponse[];
  stale: boolean;
  editingId: string | null;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  updatePending: boolean;
  onUpdate: (id: string, values: AccountFormValues) => void;
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
  editingId,
  onEdit,
  onCancelEdit,
  updatePending,
  onUpdate,
  deletingId,
  onDelete,
  onConvert,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const households = useGetHouseholdsSuspense();
  const search = useSearch({ from: "/accounts" });
  const navigate = useNavigate({ from: "/accounts" });

  function setFilter(patch: Partial<typeof search>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  function toggleSort(sort: NonNullable<typeof search.sort>) {
    const direction = nextSortDirection(sort, search.sort, search.direction);
    navigate({ search: (prev) => ({ ...prev, sort, direction }) });
  }

  const filtered = Boolean(search.search) || Boolean(search.iban) || Boolean(search.type);
  const canConvert = useUsableCurrencies().length >= 2;
  const householdNames = new Map(households.data.map((h) => [h.id, h.name]));

  const editingAccount = accounts.find((account) => account.id === editingId);

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
            size="icon"
            className="size-8"
            disabled={!canConvert}
            onClick={() => onConvert(account.id)}
            aria-label={`${t("conversions.add")}: ${account.name}`}
            tooltip={`${t("conversions.add")}: ${account.name}`}
          >
            <ArrowLeftRight />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onEdit(account.id)}
          aria-label={`${t("actions.edit")}: ${account.name}`}
          tooltip={`${t("actions.edit")}: ${account.name}`}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          pending={deletingId === account.id}
          disabled={deletingId !== null}
          onClick={() => onDelete(account.id)}
          aria-label={`${t("actions.archive")}: ${account.name}`}
          tooltip={`${t("actions.archive")}: ${account.name}`}
        >
          <Archive />
        </Button>
      </div>
    );
  }

  let body: ReactNode;
  if (accounts.length === 0) {
    body = (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={6} className="py-6 whitespace-normal text-muted-foreground">
          {filtered ? t("filters.noMatches") : t("accounts.empty")}
        </TableCell>
      </TableRow>
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
      <div className={cn("md:hidden", stale && "is-stale")} aria-busy={stale}>
        {accounts.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            {filtered ? t("filters.noMatches") : t("accounts.empty")}
          </p>
        ) : (
          <ul className="rows" aria-label={t("accounts.title")}>
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
          </ul>
        )}
      </div>
      <section className="-mx-3 hidden md:block">
        <ViewTransition name="accounts-rows" enter="none" exit="none">
          <div
            className="overflow-x-auto"
            role="region"
            aria-label={t("accounts.title")}
            tabIndex={0}
          >
            <Table className={`min-w-160 ${stale ? "is-stale" : ""}`} aria-busy={stale}>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label={t("accounts.name")}
                    sortKey="name"
                    activeSort={search.sort}
                    direction={search.direction}
                    onSort={toggleSort}
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
                    sortKey="iban"
                    activeSort={search.sort}
                    direction={search.direction}
                    onSort={toggleSort}
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
                    sortKey="type"
                    activeSort={search.sort}
                    direction={search.direction}
                    onSort={toggleSort}
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
                    sortKey="startingBalance"
                    activeSort={search.sort}
                    direction={search.direction}
                    onSort={toggleSort}
                  />
                  <SortableTableHead
                    className="text-right"
                    label={t("accounts.currentBalance")}
                    sortKey="currentBalance"
                    activeSort={search.sort}
                    direction={search.direction}
                    onSort={toggleSort}
                  />
                  <TableHead>
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{body}</TableBody>
            </Table>
          </div>
        </ViewTransition>
      </section>
      <Modal
        open={Boolean(editingAccount)}
        onOpenChange={(open) => {
          if (!open) {
            onCancelEdit();
          }
        }}
        title={t("actions.edit")}
      >
        {editingAccount ? (
          <AccountForm
            initial={editingAccount}
            pending={updatePending}
            onSubmit={(values) => onUpdate(editingAccount.id, values)}
            onCancel={onCancelEdit}
          />
        ) : null}
      </Modal>
    </>
  );
}
