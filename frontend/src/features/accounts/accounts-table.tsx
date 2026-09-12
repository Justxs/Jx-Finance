import { type ReactNode, ViewTransition } from "react";
import { Archive, Pencil } from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useGetHouseholdsEndpointSuspense } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { ColumnFilter, TextColumnFilter } from "@/components/ui/column-filter";
import { ColumnHeader } from "@/components/ui/column-header";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useMoney } from "@/hooks/use-formatters";
import { AccountTypeIcon } from "@/lib/account-icons";
import { AccountForm, type AccountFormValues } from "./account-form";

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
      <tr>
        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
          {filtered ? t("filters.noMatches") : t("accounts.empty")}
        </td>
      </tr>
    );
  } else {
    body = rows.map((account) => (
      <tr key={account.id} className="border-b last:border-0 hover:bg-muted/30">
        <td className="px-6 py-3">
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
        </td>
        <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{account.iban || "—"}</td>
        <td className="px-6 py-3">
          <span className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {t(`accounts.types.${account.type}`)}
          </span>
        </td>
        <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
          {money.format(Number(account.startingBalance))}
        </td>
        <td className="px-6 py-3 text-right font-semibold tabular-nums">
          {money.format(Number(account.currentBalance))}
        </td>
        <td className="px-6 py-3">
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
        </td>
      </tr>
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
            <table
              className={`w-full min-w-160 text-sm ${stale ? "is-stale" : ""}`}
              aria-busy={stale}
            >
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-6 py-3 text-xs font-medium tracking-wide text-muted-foreground">
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
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wide text-muted-foreground">
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
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wide text-muted-foreground">
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
                          <Select
                            value={search.type ?? ""}
                            onChange={(e) =>
                              setFilter({
                                type: (e.target.value || undefined) as typeof search.type,
                              })
                            }
                          >
                            <option value="">{t("accounts.allTypes")}</option>
                            {(["checking", "savings", "cash", "other"] as const).map((type) => (
                              <option key={type} value={type}>
                                {t(`accounts.types.${type}`)}
                              </option>
                            ))}
                          </Select>
                        </ColumnFilter>
                      }
                    />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium tracking-wide text-muted-foreground">
                    <ColumnHeader
                      label={t("accounts.startingBalance")}
                      sortKey="startingBalance"
                      activeSort={search.sort}
                      direction={search.direction}
                      onSort={toggleSort}
                    />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium tracking-wide text-muted-foreground">
                    <ColumnHeader
                      label={t("accounts.currentBalance")}
                      sortKey="currentBalance"
                      activeSort={search.sort}
                      direction={search.direction}
                      onSort={toggleSort}
                    />
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>{body}</tbody>
            </table>
          </div>
        </ViewTransition>
      </section>
      <Dialog
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
      </Dialog>
    </>
  );
}
