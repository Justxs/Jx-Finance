import { type ReactNode, ViewTransition } from "react";
import { UserX } from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { UserProfileResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { ColumnFilter, TextColumnFilter } from "@/components/ui/column-filter";
import { ColumnHeader } from "@/components/ui/column-header";
import { Select } from "@/components/ui/select";

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

  function toggleSort(key: string) {
    const sort = key as NonNullable<typeof search.sort>;
    const direction = search.sort === sort && search.direction === "asc" ? "desc" : "asc";
    navigate({ search: (prev) => ({ ...prev, sort, direction }) });
  }

  const filtered = !!search.search || !!search.role || search.isActive !== undefined;
  const rows = users;

  let body: ReactNode;
  if (rows.length === 0) {
    body = (
      <tr>
        <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
          {filtered ? t("filters.noMatches") : t("users.empty")}
        </td>
      </tr>
    );
  } else {
    body = rows.map((user) => {
      const isSelf = user.id === currentUserId;
      return (
        <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
          <td className="px-6 py-3">
            <p className="font-medium">{user.displayName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
          </td>
          <td className="px-6 py-3">
            <Select
              value={user.role}
              className={rolePendingId === user.id ? "is-stale" : undefined}
              aria-busy={rolePendingId === user.id}
              disabled={isSelf || rolePendingId !== null}
              onChange={(e) => onRoleChange(user.id!, e.target.value)}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {t(`users.roles.${role}`)}
                </option>
              ))}
            </Select>
          </td>
          <td className="px-6 py-3">
            <span
              className={
                user.isActive
                  ? "inline-flex rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
                  : "inline-flex rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
              }
            >
              {user.isActive ? t("users.active") : t("users.deactivated")}
            </span>
          </td>
          <td className="px-6 py-3">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                pending={deactivatePendingId === user.id}
                disabled={isSelf || !user.isActive || deactivatePendingId !== null}
                onClick={() => onDeactivate(user.id!)}
                aria-label={t("users.deactivate")}
                title={t("users.deactivate")}
              >
                <UserX />
              </Button>
            </div>
          </td>
        </tr>
      );
    });
  }

  return (
    <section className="card overflow-hidden">
      <ViewTransition name="users-rows" enter="none" exit="none">
        <div className="overflow-x-auto" role="region" aria-label={t("users.title")} tabIndex={0}>
          <table
            className={`w-full min-w-160 text-sm ${stale ? "is-stale" : ""}`}
            aria-busy={stale}
          >
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-6 py-3 text-xs font-medium tracking-wide text-muted-foreground">
                  <ColumnHeader
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
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wide text-muted-foreground">
                  <ColumnHeader
                    label={t("users.role")}
                    sortKey="role"
                    activeSort={search.sort}
                    direction={search.direction}
                    onSort={toggleSort}
                    filter={
                      <ColumnFilter
                        label={t("users.role")}
                        active={!!search.role}
                        onClear={() => setFilter({ role: undefined })}
                      >
                        <Select
                          value={search.role ?? ""}
                          onChange={(e) =>
                            setFilter({ role: (e.target.value || undefined) as typeof search.role })
                          }
                        >
                          <option value="">{t("users.allRoles")}</option>
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {t(`users.roles.${role}`)}
                            </option>
                          ))}
                        </Select>
                      </ColumnFilter>
                    }
                  />
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wide text-muted-foreground">
                  <ColumnHeader
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
                        <Select
                          value={search.isActive === undefined ? "" : String(search.isActive)}
                          onChange={(e) =>
                            setFilter({
                              isActive:
                                e.target.value === "" ? undefined : e.target.value === "true",
                            })
                          }
                        >
                          <option value="">{t("users.allStatuses")}</option>
                          <option value="true">{t("users.active")}</option>
                          <option value="false">{t("users.deactivated")}</option>
                        </Select>
                      </ColumnFilter>
                    }
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
  );
}
