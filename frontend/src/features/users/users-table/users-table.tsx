import { useNavigate, useSearch } from "@tanstack/react-router";
import { UserX } from "lucide-react";
import { type ReactNode, ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import type { UserProfileResponse } from "@/api/generated/model";
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
import { cn } from "@/lib/utils";

const roles = ["Member", "Admin"] as const;

interface Props {
  users: UserProfileResponse[];
  stale: boolean;
  currentUserId: string | undefined;
  onRoleChange: (id: string, role: string) => void;
  rolePendingId: string | null;
  onDeactivate: (id: string) => void;
  deactivatePendingId: string | null;
}

export function UsersTable({
  users,
  stale,
  currentUserId,
  onRoleChange,
  rolePendingId,
  onDeactivate,
  deactivatePendingId,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const search = useSearch({ from: "/users" });
  const navigate = useNavigate({ from: "/users" });

  function setFilter(patch: Partial<typeof search>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  function toggleSort(sort: NonNullable<typeof search.sort>) {
    const direction = nextSortDirection(sort, search.sort, search.direction);
    navigate({ search: (prev) => ({ ...prev, sort, direction }) });
  }

  const filtered = Boolean(search.search) || Boolean(search.role) || search.isActive !== undefined;
  const roleOptions = roles.map((role) => ({ value: role, label: t(`users.roles.${role}`) }));

  function roleSelect(user: UserProfileResponse) {
    const isSelf = user.id === currentUserId;
    return (
      <SelectField
        aria-label={`${t("users.role")}: ${user.displayName || user.email}`}
        value={user.role}
        className={rolePendingId === user.id ? "is-stale" : undefined}
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

  function deactivateButton(user: UserProfileResponse) {
    const isSelf = user.id === currentUserId;
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        pending={deactivatePendingId === user.id}
        disabled={isSelf || !user.isActive || deactivatePendingId !== null}
        onClick={() => onDeactivate(user.id)}
        aria-label={`${t("users.deactivate")}: ${user.displayName || user.email}`}
        tooltip={`${t("users.deactivate")}: ${user.displayName || user.email}`}
      >
        <UserX />
      </Button>
    );
  }

  let body: ReactNode;
  if (users.length === 0) {
    body = (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={4} className="py-6 whitespace-normal text-muted-foreground">
          {filtered ? t("filters.noMatches") : t("users.empty")}
        </TableCell>
      </TableRow>
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
            <div className="flex justify-end">{deactivateButton(user)}</div>
          </TableCell>
        </TableRow>
      );
    });
  }

  return (
    <>
      <div className={cn("md:hidden", stale && "is-stale")} aria-busy={stale}>
        {users.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            {filtered ? t("filters.noMatches") : t("users.empty")}
          </p>
        ) : (
          <ul className="rows" aria-label={t("users.title")}>
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
                  <div className="-mr-2 shrink-0">{deactivateButton(user)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <section className="-mx-3 hidden md:block">
        <ViewTransition name="users-rows" enter="none" exit="none">
          <div className="overflow-x-auto" role="region" aria-label={t("users.title")} tabIndex={0}>
            <Table className={`min-w-160 ${stale ? "is-stale" : ""}`} aria-busy={stale}>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label={t("users.displayName")}
                    sortKey="displayName"
                    activeSort={search.sort}
                    direction={search.direction}
                    onSort={toggleSort}
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
                    sortKey="role"
                    activeSort={search.sort}
                    direction={search.direction}
                    onSort={toggleSort}
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
                    sortKey="status"
                    activeSort={search.sort}
                    direction={search.direction}
                    onSort={toggleSort}
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
          </div>
        </ViewTransition>
      </section>
    </>
  );
}
