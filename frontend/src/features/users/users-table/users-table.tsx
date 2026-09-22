import { useNavigate, useSearch } from "@tanstack/react-router";
import { KeyRound, UserCheck, UserX } from "lucide-react";
import { type ReactNode, ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import type { UserProfileResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { ColumnFilter, TextColumnFilter } from "@/components/ui/column-filter/column-filter";
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
import { Tag } from "@/components/ui/tag/tag";
import { useSearchTable } from "@/hooks/use-search-table";
import { UserRole } from "@/lib/user-role";
import { cn } from "@/lib/utils";

const roles = [UserRole.member, UserRole.admin] as const;

interface Props {
  users: UserProfileResponse[];
  stale: boolean;
  currentUserId: string | undefined;
  onRoleChange: (id: string, role: string) => void;
  rolePendingId: string | null;
  onDeactivate: (id: string) => void;
  deactivatePendingId: string | null;
  onReactivate: (id: string) => void;
  reactivatePendingId: string | null;
  onResetPassword: (id: string) => void;
}

export function UsersTable({
  users,
  stale,
  currentUserId,
  onRoleChange,
  rolePendingId,
  onDeactivate,
  deactivatePendingId,
  onReactivate,
  reactivatePendingId,
  onResetPassword,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const search = useSearch({ from: "/users" });
  const navigate = useNavigate({ from: "/users" });

  const table = useSearchTable(search, (patch) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) }),
  );
  const { setFilter } = table;

  const filtered = Boolean(search.search) || Boolean(search.role) || search.isActive !== undefined;
  const roleOptions = roles.map((role) => ({ value: role, label: t(`users.roles.${role}`) }));

  function roleSelect(user: UserProfileResponse) {
    const isSelf = user.id === currentUserId;
    return (
      <SelectField
        aria-label={`${t("users.role")}: ${user.displayName || user.email}`}
        value={user.role}
        className={rolePendingId === user.id ? "stale" : undefined}
        aria-busy={rolePendingId === user.id}
        disabled={isSelf || rolePendingId !== null}
        onChange={(role) => onRoleChange(user.id, role)}
        options={roleOptions}
      />
    );
  }

  function statusTag(user: UserProfileResponse) {
    return (
      <Tag tone={user.isActive ? "neutral" : "negative"}>
        {user.isActive ? t("users.active") : t("users.deactivated")}
      </Tag>
    );
  }

  function rowActions(user: UserProfileResponse) {
    if (user.id === currentUserId) {
      return null;
    }
    const name = user.displayName || user.email;
    const busy = deactivatePendingId !== null || reactivatePendingId !== null;
    const resetLabel = `${t("users.resetPassword.action")}: ${name}`;
    const statusLabel = `${t(user.isActive ? "users.deactivate" : "users.reactivate")}: ${name}`;
    return (
      <>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onResetPassword(user.id)}
          aria-label={resetLabel}
        >
          <KeyRound />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          pending={(user.isActive ? deactivatePendingId : reactivatePendingId) === user.id}
          disabled={busy}
          onClick={() => (user.isActive ? onDeactivate(user.id) : onReactivate(user.id))}
          aria-label={statusLabel}
        >
          {user.isActive ? <UserX /> : <UserCheck />}
        </Button>
      </>
    );
  }

  let body: ReactNode;
  if (users.length === 0) {
    body = (
      <TableEmptyRow colSpan={4} filtered={filtered}>
        {t("users.empty")}
      </TableEmptyRow>
    );
  } else {
    body = users.map((user) => {
      return (
        <TableRow key={user.id}>
          <TableCell>
            <p className="font-medium">{user.displayName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
          </TableCell>
          <TableCell>{roleSelect(user)}</TableCell>
          <TableCell>{statusTag(user)}</TableCell>
          <TableCell>
            <div className="flex justify-end gap-1">{rowActions(user)}</div>
          </TableCell>
        </TableRow>
      );
    });
  }

  return (
    <>
      <StaleRegion stale={stale} className="md:hidden">
        {users.length === 0 ? (
          <EmptyText filtered={filtered}>{t("users.empty")}</EmptyText>
        ) : (
          <Rows aria-label={t("users.title")}>
            {users.map((user) => (
              <li key={user.id} className="space-y-2 py-2.5 text-sm">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium wrap-break-word">{user.displayName}</p>
                    <p className="text-xs wrap-break-word text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="shrink-0">{statusTag(user)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">{roleSelect(user)}</div>
                  <div className="-mr-2 flex shrink-0 gap-1">{rowActions(user)}</div>
                </div>
              </li>
            ))}
          </Rows>
        )}
      </StaleRegion>
      <section className="-mx-3 hidden md:block">
        <ViewTransition name="users-rows" enter="none" exit="none">
          <ScrollRegion aria-label={t("users.title")}>
            <Table className={cn("min-w-160", stale && "stale")} aria-busy={stale}>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label={t("users.displayName")}
                    {...table.sortProps("displayName")}
                    filter={
                      <TextColumnFilter
                        label={t("users.displayName")}
                        value={search.search ?? ""}
                        debounceMs={300}
                        onChange={(value) => setFilter({ search: value || undefined })}
                      />
                    }
                  />
                  <SortableTableHead
                    label={t("users.role")}
                    {...table.sortProps("role")}
                    filter={
                      <ColumnFilter
                        label={t("users.role")}
                        active={Boolean(search.role)}
                        onClear={() => setFilter({ role: undefined })}
                      >
                        <SelectField
                          aria-label={t("users.role")}
                          value={search.role ?? ""}
                          onChange={(role) => setFilter({ role: role || undefined })}
                          options={[{ value: "", label: t("users.allRoles") }, ...roleOptions]}
                        />
                      </ColumnFilter>
                    }
                  />
                  <SortableTableHead
                    label={t("users.status")}
                    {...table.sortProps("status")}
                    filter={
                      <ColumnFilter
                        label={t("users.status")}
                        active={search.isActive !== undefined}
                        onClear={() => setFilter({ isActive: undefined })}
                      >
                        <SelectField
                          aria-label={t("users.status")}
                          value={search.isActive === undefined ? "" : String(search.isActive)}
                          onChange={(value) =>
                            setFilter({ isActive: value === "" ? undefined : value === "true" })
                          }
                          options={[
                            { value: "", label: t("users.allStatuses") },
                            { value: "true", label: t("users.active") },
                            { value: "false", label: t("users.deactivated") },
                          ]}
                        />
                      </ColumnFilter>
                    }
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
