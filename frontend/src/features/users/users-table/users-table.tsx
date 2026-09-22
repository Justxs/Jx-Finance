import { useNavigate, useSearch } from "@tanstack/react-router";
import { type ReactNode, ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import type { UserProfileResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { ColumnFilter, TextColumnFilter } from "@/components/ui/column-filter/column-filter";
import { SortableTableHead } from "@/components/ui/column-header/column-header";
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
import { useSearchTable } from "@/hooks/use-search-table";
import { cn } from "@/lib/utils";
import { roleOptions } from "../user-queries";
import {
  type UserRowControls,
  UserRoleSelect,
  UserRowActions,
  UserStatusTag,
} from "./user-row-parts";
import { UsersMobileList } from "./users-mobile-list";

interface Props extends UserRowControls {
  users: UserProfileResponse[];
  stale: boolean;
}

export function UsersTable({ users, stale, ...controls }: Readonly<Props>) {
  const { t } = useTranslation();
  const search = useSearch({ from: "/users" });
  const navigate = useNavigate({ from: "/users" });

  function patchSearch(patch: Partial<typeof search>) {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }
  const table = useSearchTable(search, patchSearch);

  const filtered = Boolean(search.search) || Boolean(search.role) || search.isActive !== undefined;
  const options = roleOptions(t);

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
          <TableCell>
            <UserRoleSelect user={user} controls={controls} />
          </TableCell>
          <TableCell>
            <UserStatusTag user={user} />
          </TableCell>
          <TableCell>
            <div className="flex justify-end gap-1">
              <UserRowActions user={user} controls={controls} />
            </div>
          </TableCell>
        </TableRow>
      );
    });
  }

  return (
    <>
      <UsersMobileList users={users} stale={stale} filtered={filtered} controls={controls} />
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
                        onChange={(value) => patchSearch({ search: value || undefined })}
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
                        onClear={() => patchSearch({ role: undefined })}
                      >
                        <SelectField
                          aria-label={t("users.role")}
                          value={search.role ?? ""}
                          onChange={(role) => patchSearch({ role: role || undefined })}
                          options={[{ value: "", label: t("users.allRoles") }, ...options]}
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
                        onClear={() => patchSearch({ isActive: undefined })}
                      >
                        <SelectField
                          aria-label={t("users.status")}
                          value={search.isActive === undefined ? "" : String(search.isActive)}
                          onChange={(value) =>
                            patchSearch({ isActive: value === "" ? undefined : value === "true" })
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
