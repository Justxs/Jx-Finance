import { type ReactNode, ViewTransition } from "react";
import { Archive, Pencil } from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useGetHouseholdsEndpointSuspense } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { ColumnFilter, TextColumnFilter } from "@/components/ui/column-filter";
import { ColumnHeader } from "@/components/ui/column-header";
import { Modal } from "@/components/modal";
import { SelectField } from "@/components/select-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMoney } from "@/hooks/use-formatters";
import { AccountTypeIcon } from "@/lib/account-icons";
import { AccountForm, type AccountFormValues } from "../account-form";

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
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const households = useGetHouseholdsEndpointSuspense();
  const search = useSearch({ from: "/accounts" });
  const navigate = useNavigate({ from: "/accounts" });

  function setFilter(patch: Partial<typeof search>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  function toggleSort(key: string) {
    const sort = key as NonNullable<typeof search.sort>;
    const direction = search.sort === sort && search.direction === "asc" ? "desc" : "asc";
    navigate({ search: (prev) => ({ ...prev, sort, direction }) });
  }

  const filtered = !!search.search || !!search.iban || !!search.type;
  const rows = accounts;
  const householdNames = new Map(
    (households.data as Array<{ id: string; name: string }> | undefined)?.map((h) => [
      h.id,
      h.name,
    ]) ?? [],
  );

  const editingAccount = accounts.find((account) => account.id === editingId);

  let body: ReactNode;
  if (rows.length === 0) {
    body = (
      <TableRow className="hover:bg-transparent">
        <TableCell
          colSpan={6}
          className="px-6 py-10 text-center whitespace-normal text-muted-foreground"
        >
          {filtered ? t("filters.noMatches") : t("accounts.empty")}
        </TableCell>
      </TableRow>
    );
  } else {
    body = rows.map((account) => (
      <TableRow key={account.id}>
        <TableCell className="px-6 py-3 whitespace-normal">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <AccountTypeIcon type={account.type ?? "other"} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{account.name}</p>
                {account.scope === "shared" ? (
                  <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {t("sharing.sharedWith", {
                      household: householdNames.get(account.householdId ?? "") ?? "",
                    })}
                  </span>
                ) : null}
              </div>
              {account.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{account.description}</p>
              ) : null}
            </div>
          </div>
        </TableCell>
        <TableCell className="px-6 py-3 font-mono text-xs text-muted-foreground">
          {account.iban || "—"}
        </TableCell>
        <TableCell className="px-6 py-3">
          <span className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {t(`accounts.types.${account.type}`)}
          </span>
        </TableCell>
        <TableCell className="px-6 py-3 text-right tabular-nums text-muted-foreground">
          {money.format(Number(account.startingBalance))}
        </TableCell>
        <TableCell className="px-6 py-3 text-right font-semibold tabular-nums">
          {money.format(Number(account.currentBalance))}
        </TableCell>
        <TableCell className="px-6 py-3">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onEdit(account.id!)}
              aria-label={t("actions.edit")}
              title={t("actions.edit")}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              pending={deletingId === account.id}
              disabled={deletingId !== null}
              onClick={() => onDelete(account.id!)}
              aria-label={t("actions.archive")}
              title={t("actions.archive")}
            >
              <Archive />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  }

  return (
    <>
      <section className="card overflow-hidden">
        <ViewTransition name="accounts-rows" enter="none" exit="none">
          <div
            className="overflow-x-auto"
            role="region"
            aria-label={t("accounts.title")}
            tabIndex={0}
          >
            <Table className={`min-w-160 ${stale ? "is-stale" : ""}`} aria-busy={stale}>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="px-6 py-3 text-xs tracking-wide text-muted-foreground">
                    <ColumnHeader
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
                  </TableHead>
                  <TableHead className="px-6 py-3 text-xs tracking-wide text-muted-foreground">
                    <ColumnHeader
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
                  </TableHead>
                  <TableHead className="px-6 py-3 text-xs tracking-wide text-muted-foreground">
                    <ColumnHeader
                      label={t("accounts.type")}
                      sortKey="type"
                      activeSort={search.sort}
                      direction={search.direction}
                      onSort={toggleSort}
                      filter={
                        <ColumnFilter
                          label={t("accounts.type")}
                          active={!!search.type}
                          onClear={() => setFilter({ type: undefined })}
                        >
                          <SelectField
                            value={search.type ?? ""}
                            onChange={(value) => setFilter({ type: value || undefined })}
                            options={[
                              { value: "", label: t("accounts.allTypes") },
                              ...(["checking", "savings", "cash", "other"] as const).map(
                                (type) => ({
                                  value: type,
                                  label: t(`accounts.types.${type}`),
                                }),
                              ),
                            ]}
                          />
                        </ColumnFilter>
                      }
                    />
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs tracking-wide text-muted-foreground">
                    <ColumnHeader
                      label={t("accounts.startingBalance")}
                      sortKey="startingBalance"
                      activeSort={search.sort}
                      direction={search.direction}
                      onSort={toggleSort}
                    />
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs tracking-wide text-muted-foreground">
                    <ColumnHeader
                      label={t("accounts.currentBalance")}
                      sortKey="currentBalance"
                      activeSort={search.sort}
                      direction={search.direction}
                      onSort={toggleSort}
                    />
                  </TableHead>
                  <TableHead className="px-6 py-3" />
                </TableRow>
              </TableHeader>
              <TableBody>{body}</TableBody>
            </Table>
          </div>
        </ViewTransition>
      </section>
      <Modal
        open={!!editingAccount}
        onOpenChange={(open) => {
          if (!open) onCancelEdit();
        }}
        title={t("actions.edit")}
      >
        {editingAccount ? (
          <AccountForm
            initial={editingAccount}
            pending={updatePending}
            onSubmit={(values) => onUpdate(editingAccount.id!, values)}
            onCancel={onCancelEdit}
          />
        ) : null}
      </Modal>
    </>
  );
}
