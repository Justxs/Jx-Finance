import { type ReactNode, ViewTransition } from "react";
import { UserX } from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { UserProfileResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { ColumnFilter, TextColumnFilter } from "@/components/ui/column-filter";
import { ColumnHeader } from "@/components/ui/column-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SelectField } from "@/components/select-field";

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
  const roleOptions = roles.map((role) => ({ value: role, label: t(`users.roles.${role}`) }));

  let body: ReactNode;
  if (rows.length === 0) {
    body = (
      <TableRow>
        <TableCell colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
          {filtered ? t("filters.noMatches") : t("users.empty")}
        </TableCell>
      </TableRow>
    );
  } else {
    body = rows.map((user) => {
      const isSelf = user.id === currentUserId;
      return (
        <TableRow key={user.id} className="hover:bg-muted/30">
          <TableCell className="px-6 py-3">
            <p className="font-medium">{user.displayName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
          </TableCell>
          <TableCell className="px-6 py-3">
            <SelectField
              value={user.role}
              className={rolePendingId === user.id ? "is-stale" : undefined}
              aria-busy={rolePendingId === user.id}
              disabled={isSelf || rolePendingId !== null}
              onChange={(role) => onRoleChange(user.id!, role)}
              options={roleOptions}
            />
          </TableCell>
          <TableCell className="px-6 py-3">
            <span
              className={
                user.isActive
                  ? "inline-flex rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
                  : "inline-flex rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
              }
            >
              {user.isActive ? t("users.active") : t("users.deactivated")}
            </span>
          </TableCell>
          <TableCell className="px-6 py-3">
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
          </TableCell>
        </TableRow>
      );
    });
  }

  return (
    <section className="card overflow-hidden">
      <ViewTransition name="users-rows" enter="none" exit="none">
        <div className="overflow-x-auto" role="region" aria-label={t("users.title")} tabIndex={0}>
          <Table className={`min-w-160 ${stale ? "is-stale" : ""}`} aria-busy={stale}>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-auto px-6 py-3 text-xs tracking-wide text-muted-foreground">
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
                </TableHead>
                <TableHead className="h-auto px-6 py-3 text-xs tracking-wide text-muted-foreground">
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
                        <SelectField
                          value={search.role ?? ""}
                          onChange={(role) => setFilter({ role: role || undefined })}
                          options={[{ value: "", label: t("users.allRoles") }, ...roleOptions]}
                        />
                      </ColumnFilter>
                    }
                  />
                </TableHead>
                <TableHead className="h-auto px-6 py-3 text-xs tracking-wide text-muted-foreground">
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
                        <SelectField
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
                </TableHead>
                <TableHead className="h-auto px-6 py-3" />
              </TableRow>
            </TableHeader>
            <TableBody>{body}</TableBody>
          </Table>
        </div>
      </ViewTransition>
    </section>
  );
}
