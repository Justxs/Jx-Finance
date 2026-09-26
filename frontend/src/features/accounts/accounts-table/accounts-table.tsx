import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeftRight } from "lucide-react";
import { type ReactNode, ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { RowActions } from "@/components/row-actions/row-actions";
import { SharedScopeTag } from "@/components/shared-scope-tag/shared-scope-tag";
import { Button } from "@/components/ui/button/button";
import { SelectColumnFilter, TextColumnFilter } from "@/components/ui/column-filter/column-filter";
import { SortableTableHead } from "@/components/ui/column-header/column-header";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
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
import { EMPTY_VALUE, useMoney, useUsableCurrencies } from "@/hooks/use-formatters";
import { useSearchTable } from "@/hooks/use-search-table";
import { AccountTypeIcon } from "@/lib/account-icons";
import { nameById, optionsOf } from "@/lib/options";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn, metaLine } from "@/lib/utils";
import { accountTypes } from "../account-types";

interface Props {
  accounts: AccountResponse[];
  stale: boolean;
  onEdit: (id: string) => void;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onConvert?: (id: string) => void;
}

function balanceTone(account: AccountResponse) {
  return Number(account.currentBalance) < 0 ? EXPENSE_TONE : undefined;
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

  function patchSearch(patch: Partial<typeof search>) {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }
  const table = useSearchTable(search, patchSearch);

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
      <RowActions
        label={account.name}
        removeKind="archive"
        onEdit={() => onEdit(account.id)}
        onDelete={() => onDelete(account.id)}
        deletePending={deletingId === account.id}
        deleteDisabled={deletingId !== null}
        className="justify-end"
      >
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
      </RowActions>
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
              <SharedScopeTag
                scope={account.scope}
                householdName={householdNames.get(account.householdId ?? "")}
                className="mt-1"
              />
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
        <TableCell className="text-right font-semibold tabular-nums">
          <span className={balanceTone(account)}>{balanceLines(account)}</span>
        </TableCell>
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
              const secondary = metaLine(
                t(`accounts.types.${account.type}`),
                account.scope === "shared"
                  ? t("sharing.sharedWith", {
                      household: householdNames.get(account.householdId ?? "") ?? "",
                    })
                  : null,
                account.iban,
              );

              return (
                <li key={account.id} className="py-2.5 text-sm">
                  <div className="flex items-start gap-3">
                    <p className="min-w-0 flex-1 font-medium wrap-break-word">{account.name}</p>
                    <div
                      className={cn(
                        "shrink-0 text-right font-semibold tabular-nums",
                        balanceTone(account),
                      )}
                    >
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
            <Table className={cn("min-w-160", stale && "stale")} aria-busy={stale}>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label={t("accounts.name")}
                    {...table.sortProps("name")}
                    filter={
                      <TextColumnFilter
                        label={t("accounts.name")}
                        value={search.search ?? ""}
                        onChange={(value) => patchSearch({ search: value || undefined })}
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
                        onChange={(value) => patchSearch({ iban: value || undefined })}
                      />
                    }
                  />
                  <SortableTableHead
                    label={t("accounts.type")}
                    {...table.sortProps("type")}
                    filter={
                      <SelectColumnFilter
                        label={t("accounts.type")}
                        value={search.type ?? ""}
                        onChange={(value) => patchSearch({ type: value || undefined })}
                        options={[
                          { value: "", label: t("accounts.allTypes") },
                          ...optionsOf(accountTypes, (type) => t(`accounts.types.${type}`)),
                        ]}
                      />
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
